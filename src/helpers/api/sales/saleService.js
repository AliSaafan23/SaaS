import { Op } from 'sequelize';
import {
    sequelize,
    Sale,
    SaleItem,
    SalePayment,
    Customer,
    CustomerPayment,
    Product,
    SaleReturn,
} from '../../../models/index.js';
import { requireCatalogTenant, scopedCatalogWhere } from '../inventory/catalogScope.js';
import { findCustomerInScope } from '../customers/customerService.js';
import { findProductInScope } from '../inventory/productService.js';
import { computeCustomerReceivables, applyCustomerPaymentAllocation } from '../customers/customerBalance.js';
import {
    getProductSalePrice,
    resolveSalePriceLevel,
} from '../../pos/pricing.js';
import { removeStock, addStock } from '../../pos/stockService.js';
import { recordCashboxTransaction } from '../../pos/cashboxService.js';
import {
    computeSaleTotals,
    computeSalePreview,
    roundMoney,
} from './saleCalculations.js';
import {
    resolveSalePaymentPlan,
    assertPaymentCustomerRules,
    getActivePaymentMethod,
    getPaymentMethodByCode,
    normalizeTotalsForCreditPayment,
} from './paymentMethodResolver.js';

import { SaleScopeError } from './saleErrors.js';
import {
    getReturnedQtyMapForSaleItems,
    getSaleReturnsSummary,
} from './saleReturnService.js';

export { SaleScopeError } from './saleErrors.js';

const saleIncludes = [
    {
        association: 'customer',
        attributes: [
            'id',
            'customer_code',
            'name',
            'phone',
            'price_level',
            'opening_balance',
        ],
        required: false,
    },
    {
        association: 'items',
        include: [
            {
                association: 'product',
                attributes: ['id', 'barcode', 'name'],
                include: [{ association: 'baseUnit', attributes: ['id', 'name'], required: false }],
            },
        ],
    },
    { association: 'payments', include: [{ association: 'paymentMethod', required: false }] },
    {
        association: 'paymentMethod',
        required: false,
    },
];

const scopedSaleWhere = async (req, extra = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    return { branchId, ...extra };
};

export const generateNextInvoiceNo = async (branchId, transaction) => {
    const last = await Sale.findOne({
        where: { branchId },
        order: [['id', 'DESC']],
        attributes: ['invoice_no'],
        transaction,
    });

    if (!last?.invoice_no) return '1';

    const numeric = Number.parseInt(String(last.invoice_no).replace(/\D/g, ''), 10);
    return String(Number.isFinite(numeric) && numeric > 0 ? numeric + 1 : 1);
};

const findSaleInScope = async (req, saleId, { transaction, status } = {}) => {
    const where = await scopedSaleWhere(req, { id: saleId });
    if (status) where.status = status;
    return Sale.findOne({
        where,
        include: saleIncludes,
        transaction,
    });
};

const resolveItemLines = async (req, items, { salePriceType, customer }) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new SaleScopeError('saleItemsRequired');
    }

    const priceLevel = resolveSalePriceLevel({
        salePriceType,
        customerPriceLevel: customer?.price_level,
    });

    const lines = [];

    for (const raw of items) {
        const productId = Number(raw.productId ?? raw.product_id);
        if (!productId) throw new SaleScopeError('saleItemsRequired');

        const product = await findProductInScope(req, productId, { status: 'active' });
        if (!product) throw new SaleScopeError('productNotFound');

        const qty = Number(raw.qty);
        if (!Number.isFinite(qty) || qty <= 0) throw new SaleScopeError('invalidSaleQty');

        const price =
            raw.price != null && raw.price !== ''
                ? roundMoney(raw.price)
                : getProductSalePrice(product, priceLevel);

        const taxPercent = Number(product.tax_percent) || 0;
        const lineSubtotal = roundMoney(qty * price);
        const tax = raw.tax != null ? roundMoney(raw.tax) : roundMoney((lineSubtotal * taxPercent) / 100);
        const discount = roundMoney(raw.discount ?? 0);

        lines.push({
            product_id: product.id,
            product,
            qty,
            price,
            discount,
            tax,
        });
    }

    return lines;
};

const legacyPaymentCode = (method) => {
    const code = method?.code;
    return ['cash', 'card', 'credit', 'cheque'].includes(code) ? code : 'cash';
};

const normalizeIncomingPaymentMethodId = async (payload) => {
    const directId = payload.paymentMethodId ?? payload.payment_method_id;
    if (directId) return Number(directId);

    if (payload.paymentMethod) {
        const method = await getPaymentMethodByCode(String(payload.paymentMethod).toLowerCase());
        return method.id;
    }

    return null;
};

const recordSaleCashInflow = async ({ sale, paymentRows, branchId, transaction }) => {
    for (const row of paymentRows) {
        if (!row.method?.affectsCashbox) continue;
        const amount = roundMoney(row.amount);
        if (amount <= 0) continue;

        await recordCashboxTransaction({
            type: 'sale',
            amount,
            saleId: sale.id,
            branchId,
            description: `Sale invoice ${sale.invoice_no}`,
            transactionDate: sale.invoice_date,
            transaction,
        });
    }
};

const applyStockForItems = async ({ items, saleId, branchId, transaction, reverse = false }) => {
    for (const line of items) {
        const params = {
            productId: line.product_id,
            qty: line.qty,
            saleId,
            branchId,
            transaction,
            movementType: reverse ? 'sale_return' : 'sale',
        };

        if (reverse) {
            await addStock({
                ...params,
                movementType: 'sale_return',
            });
        } else {
            try {
                await removeStock({
                    ...params,
                    movementType: 'sale',
                });
            } catch (err) {
                if (String(err.message).includes('insufficient stock')) {
                    throw new SaleScopeError('insufficientStock');
                }
                throw err;
            }
        }
    }
};

export const getSalesMeta = async (req) => {
    const { branchId } = await requireCatalogTenant(req);
    const nextInvoiceNo = await generateNextInvoiceNo(branchId);
    return {
        nextInvoiceNo,
        defaultSalePriceType: 1,
        branchId,
    };
};

export const calculateSalePreview = async (req, payload) => {
    const customer = payload.customerId
        ? await findCustomerInScope(req, payload.customerId)
        : null;

    const rawLines = await resolveItemLines(req, payload.items, {
        salePriceType: payload.salePriceType,
        customer,
    });

    const totals = computeSaleTotals({
        items: rawLines,
        invoiceDiscount: payload.invoiceDiscount,
        discountPercent: payload.discountPercent,
        paidAmount: payload.paidAmount,
    });

    return {
        ...totals,
        preview: computeSalePreview(totals),
    };
};

export const listSales = async (req, { search, status, page = 1, limit = 50 } = {}) => {
    const where = await scopedSaleWhere(req, {});
    if (status && status !== 'all') where.status = status;

    if (search?.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [{ invoice_no: { [Op.like]: term } }];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * pageLimit;

    const { rows, count } = await Sale.findAndCountAll({
        where,
        include: [
            {
                association: 'customer',
                attributes: ['id', 'name'],
                required: false,
            },
            {
                association: 'items',
                attributes: ['id'],
            },
        ],
        order: [['invoice_date', 'DESC'], ['id', 'DESC']],
        limit: pageLimit,
        offset,
        distinct: true,
    });

    return {
        items: rows,
        pagination: {
            page: pageNum,
            limit: pageLimit,
            total: count,
            pages: Math.ceil(count / pageLimit) || 1,
        },
    };
};

export const getSaleById = async (req, saleId) => {
    const sale = await findSaleInScope(req, saleId);
    if (!sale) throw new SaleScopeError('saleNotFound');

    const saleItemIds = (sale.items || []).map((item) => item.id);
    const [returnedQtyMap, returnsSummary] = await Promise.all([
        getReturnedQtyMapForSaleItems(saleItemIds),
        getSaleReturnsSummary(sale.id),
    ]);

    sale.setDataValue('returnedQtyMap', returnedQtyMap);
    sale.setDataValue('returnsSummary', {
        ...returnsSummary,
        original_total: roundMoney(Number(sale.total) + returnsSummary.total),
    });

    return sale;
};

export const getCustomerReceivableForSale = async (req, customerId) => {
    const customer = await findCustomerInScope(req, customerId);
    if (!customer) throw new SaleScopeError('customerNotFound');
    const { branchId } = await requireCatalogTenant(req);
    const balances = await computeCustomerReceivables(customer, branchId);
    return { customer, balances };
};

export const createSale = async (req, payload) => {
    const { branchId } = await requireCatalogTenant(req);
    const cashierId = req.cashier?.id ?? null;

    const customer = payload.customerId
        ? await findCustomerInScope(req, payload.customerId)
        : null;
    if (payload.customerId && !customer) throw new SaleScopeError('customerNotFound');

    const rawLines = await resolveItemLines(req, payload.items, {
        salePriceType: payload.salePriceType,
        customer,
    });

    const totals = computeSaleTotals({
        items: rawLines,
        invoiceDiscount: payload.invoiceDiscount,
        discountPercent: payload.discountPercent,
        paidAmount: payload.paidAmount,
    });

    const splitPayments = (payload.payments || [])
        .filter((p) => roundMoney(p.amount) > 0)
        .map((p) => ({
            paymentMethodId: p.paymentMethodId ?? p.payment_method_id,
            amount: roundMoney(p.amount),
        }));

    const paymentMethodId = await normalizeIncomingPaymentMethodId(payload);
    if (!paymentMethodId && splitPayments.length === 0) {
        throw new SaleScopeError('paymentMethodRequired');
    }

    let normalizedTotals = totals;
    if (paymentMethodId && splitPayments.length === 0) {
        const primaryMethod = await getActivePaymentMethod(paymentMethodId);
        normalizedTotals = normalizeTotalsForCreditPayment(totals, primaryMethod);
    }

    const paymentPlan = await resolveSalePaymentPlan({
        paymentMethodId,
        payments: splitPayments,
        totals: normalizedTotals,
    });

    assertPaymentCustomerRules(customer, paymentPlan);

    if (normalizedTotals.paid_amount > normalizedTotals.total) {
        throw new SaleScopeError('paymentExceedsTotal');
    }

    return sequelize.transaction(async (transaction) => {
        const invoice_no = await generateNextInvoiceNo(branchId, transaction);

        const sale = await Sale.create(
            {
                invoice_no,
                customer_id: customer?.id ?? null,
                invoice_date: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
                subtotal: normalizedTotals.subtotal,
                item_discount: normalizedTotals.item_discount,
                invoice_discount: normalizedTotals.invoice_discount,
                discount_percent: normalizedTotals.discount_percent,
                tax_amount: normalizedTotals.tax_amount,
                total: normalizedTotals.total,
                paid_amount: normalizedTotals.paid_amount,
                due_amount: normalizedTotals.due_amount,
                payment_method: paymentPlan.legacyCode,
                payment_method_id: paymentPlan.primaryMethodId,
                sale_price_type: resolveSalePriceLevel({
                    salePriceType: payload.salePriceType,
                    customerPriceLevel: customer?.price_level,
                }),
                notes: payload.notes?.trim() || null,
                status: 'completed',
                branchId,
                cashierId,
            },
            { transaction }
        );

        const itemRows = totals.items.map((line) => ({
            sale_id: sale.id,
            product_id: line.product_id,
            qty: line.qty,
            price: line.price,
            discount: line.discount,
            tax: line.tax,
            total: line.total,
        }));

        await SaleItem.bulkCreate(itemRows, { transaction });

        if (paymentPlan.rows.length > 0) {
            await SalePayment.bulkCreate(
                paymentPlan.rows.map((row) => ({
                    sale_id: sale.id,
                    payment_method_id: row.method.id,
                    payment_method: legacyPaymentCode(row.method),
                    amount: row.amount,
                })),
                { transaction }
            );
        }

        await applyStockForItems({
            items: totals.items,
            saleId: sale.id,
            branchId,
            transaction,
        });

        await recordSaleCashInflow({
            sale,
            paymentRows: paymentPlan.rows,
            branchId,
            transaction,
        });

        return findSaleInScope(req, sale.id, { transaction });
    });
};

export const cancelSale = async (req, saleId) => {
    const sale = await findSaleInScope(req, saleId);
    if (!sale) throw new SaleScopeError('saleNotFound');
    if (sale.status === 'cancelled') throw new SaleScopeError('saleAlreadyCancelled');

    const returnCount = await SaleReturn.count({ where: { sale_id: sale.id } });
    if (returnCount > 0) throw new SaleScopeError('saleHasReturns');

    return sequelize.transaction(async (transaction) => {
        await applyStockForItems({
            items: sale.items,
            saleId: sale.id,
            branchId: sale.branchId,
            transaction,
            reverse: true,
        });

        for (const row of sale.payments || []) {
            if (!row.paymentMethod?.affectsCashbox) continue;
            const amount = roundMoney(row.amount);
            if (amount <= 0) continue;

            await recordCashboxTransaction({
                type: 'withdraw',
                amount,
                saleId: sale.id,
                branchId: sale.branchId,
                description: `Sale cancel — invoice ${sale.invoice_no}`,
                transactionDate: new Date(),
                transaction,
            });
        }

        await sale.update(
            {
                status: 'cancelled',
                due_amount: 0,
                paid_amount: 0,
                total: 0,
            },
            { transaction }
        );

        return findSaleInScope(req, sale.id, { transaction });
    });
};

export const updateSale = async (req, saleId, payload) => {
    const existing = await findSaleInScope(req, saleId);
    if (!existing) throw new SaleScopeError('saleNotFound');
    if (existing.status === 'cancelled') throw new SaleScopeError('saleCannotEditCancelled');

    const customer = payload.customerId
        ? await findCustomerInScope(req, payload.customerId)
        : null;
    if (payload.customerId && !customer) throw new SaleScopeError('customerNotFound');

    const rawLines = await resolveItemLines(req, payload.items, {
        salePriceType: payload.salePriceType ?? existing.sale_price_type,
        customer,
    });

    const totals = computeSaleTotals({
        items: rawLines,
        invoiceDiscount: payload.invoiceDiscount,
        discountPercent: payload.discountPercent,
        paidAmount: payload.paidAmount,
    });

    const splitPayments = (payload.payments || [])
        .filter((p) => roundMoney(p.amount) > 0)
        .map((p) => ({
            paymentMethodId: p.paymentMethodId ?? p.payment_method_id,
            amount: roundMoney(p.amount),
        }));

    const paymentMethodId =
        (await normalizeIncomingPaymentMethodId(payload)) || existing.payment_method_id;
    if (!paymentMethodId && splitPayments.length === 0) {
        throw new SaleScopeError('paymentMethodRequired');
    }

    let normalizedTotals = totals;
    if (paymentMethodId && splitPayments.length === 0) {
        const primaryMethod = await getActivePaymentMethod(paymentMethodId);
        normalizedTotals = normalizeTotalsForCreditPayment(totals, primaryMethod);
    }

    const paymentPlan = await resolveSalePaymentPlan({
        paymentMethodId,
        payments: splitPayments,
        totals: normalizedTotals,
    });

    assertPaymentCustomerRules(customer, paymentPlan);

    if (normalizedTotals.paid_amount > normalizedTotals.total) {
        throw new SaleScopeError('paymentExceedsTotal');
    }

    return sequelize.transaction(async (transaction) => {
        await applyStockForItems({
            items: existing.items,
            saleId: existing.id,
            branchId: existing.branchId,
            transaction,
            reverse: true,
        });

        await SaleItem.destroy({ where: { sale_id: existing.id }, transaction });
        await SalePayment.destroy({ where: { sale_id: existing.id }, transaction });

        await existing.update(
            {
                customer_id: customer?.id ?? null,
                invoice_date: payload.invoiceDate
                    ? new Date(payload.invoiceDate)
                    : existing.invoice_date,
                subtotal: normalizedTotals.subtotal,
                item_discount: normalizedTotals.item_discount,
                invoice_discount: normalizedTotals.invoice_discount,
                discount_percent: normalizedTotals.discount_percent,
                tax_amount: normalizedTotals.tax_amount,
                total: normalizedTotals.total,
                paid_amount: normalizedTotals.paid_amount,
                due_amount: normalizedTotals.due_amount,
                payment_method: paymentPlan.legacyCode,
                payment_method_id: paymentPlan.primaryMethodId,
                sale_price_type: resolveSalePriceLevel({
                    salePriceType: payload.salePriceType ?? existing.sale_price_type,
                    customerPriceLevel: customer?.price_level,
                }),
                notes: payload.notes?.trim() ?? existing.notes,
            },
            { transaction }
        );

        await SaleItem.bulkCreate(
            totals.items.map((line) => ({
                sale_id: existing.id,
                product_id: line.product_id,
                qty: line.qty,
                price: line.price,
                discount: line.discount,
                tax: line.tax,
                total: line.total,
            })),
            { transaction }
        );

        if (paymentPlan.rows.length > 0) {
            await SalePayment.bulkCreate(
                paymentPlan.rows.map((row) => ({
                    sale_id: existing.id,
                    payment_method_id: row.method.id,
                    payment_method: legacyPaymentCode(row.method),
                    amount: row.amount,
                })),
                { transaction }
            );
        }

        await applyStockForItems({
            items: totals.items,
            saleId: existing.id,
            branchId: existing.branchId,
            transaction,
        });

        await recordSaleCashInflow({
            sale: existing,
            paymentRows: paymentPlan.rows,
            branchId: existing.branchId,
            transaction,
        });

        return findSaleInScope(req, existing.id, { transaction });
    });
};

const customerPaymentIncludes = (customerWhere) => [
    {
        association: 'customer',
        attributes: ['id', 'customer_code', 'name', 'phone', 'price_level', 'opening_balance'],
        where: customerWhere,
        required: true,
    },
    {
        association: 'paymentMethod',
        required: false,
    },
];

export const listCustomerPayments = async (
    req,
    { search, customerId, paymentMethodId, dateFrom, dateTo, page = 1, limit = 50 } = {}
) => {
    const customerWhere = await scopedCatalogWhere(req, {});
    if (customerId) customerWhere.id = customerId;

    if (search?.trim()) {
        const term = `%${search.trim()}%`;
        customerWhere[Op.or] = [
            { name: { [Op.like]: term } },
            { phone: { [Op.like]: term } },
            { customer_code: { [Op.like]: term } },
        ];
    }

    const paymentWhere = {};
    if (paymentMethodId) paymentWhere.payment_method_id = paymentMethodId;

    if (dateFrom || dateTo) {
        paymentWhere.payment_date = {};
        if (dateFrom) paymentWhere.payment_date[Op.gte] = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            paymentWhere.payment_date[Op.lte] = end;
        }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * pageLimit;

    const { rows, count } = await CustomerPayment.findAndCountAll({
        where: paymentWhere,
        include: customerPaymentIncludes(customerWhere),
        order: [
            ['payment_date', 'DESC'],
            ['id', 'DESC'],
        ],
        limit: pageLimit,
        offset,
        distinct: true,
    });

    return {
        items: rows,
        pagination: {
            page: pageNum,
            limit: pageLimit,
            total: count,
            pages: Math.ceil(count / pageLimit) || 1,
        },
    };
};

export const listCustomerPaymentsByCustomer = async (req, customerId, options = {}) => {
    const customer = await findCustomerInScope(req, customerId);
    if (!customer) throw new SaleScopeError('customerNotFound');

    return listCustomerPayments(req, {
        ...options,
        customerId: customer.id,
    });
};

export const recordCustomerDebtPayment = async (req, payload, customerId) => {
    const resolvedCustomerId = Number(customerId ?? payload.customerId);
    const customer = await findCustomerInScope(req, resolvedCustomerId);
    if (!customer) throw new SaleScopeError('customerNotFound');

    const amount = roundMoney(payload.amount);
    if (amount <= 0) throw new SaleScopeError('invalidPaymentAmount');

    const paymentMethodId = await normalizeIncomingPaymentMethodId(payload);
    if (!paymentMethodId) throw new SaleScopeError('paymentMethodRequired');

    const method = await getActivePaymentMethod(paymentMethodId);
    const { branchId } = await requireCatalogTenant(req);

    return sequelize.transaction(async (transaction) => {
        const balancesBefore = await computeCustomerReceivables(customer, branchId, { transaction });

        if (balancesBefore.total <= 0) {
            throw new SaleScopeError('customerNoOutstandingBalance');
        }

        if (amount > balancesBefore.total) {
            throw new SaleScopeError('paymentExceedsCustomerBalance');
        }

        const payment = await CustomerPayment.create(
            {
                customer_id: customer.id,
                amount,
                payment_method: legacyPaymentCode(method),
                payment_method_id: method.id,
                payment_date: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
                notes: payload.notes?.trim() || null,
            },
            { transaction }
        );

        if (method.affectsCashbox) {
            await recordCashboxTransaction({
                type: 'customer_payment',
                amount,
                customerPaymentId: payment.id,
                branchId,
                description: `Customer payment — ${customer.name}`,
                transactionDate: payment.payment_date,
                transaction,
            });
        }

        await applyCustomerPaymentAllocation({
            customer,
            branchId,
            amount,
            transaction,
        });

        await customer.reload({ transaction });
        const balances = await computeCustomerReceivables(customer, branchId, { transaction });
        const paymentWithMethod = await CustomerPayment.findByPk(payment.id, {
            include: [{ association: 'paymentMethod', required: false }],
            transaction,
        });
        return { payment: paymentWithMethod, customer, balances };
    });
};

export default {
    SaleScopeError,
    getSalesMeta,
    calculateSalePreview,
    listSales,
    getSaleById,
    getCustomerReceivableForSale,
    createSale,
    updateSale,
    cancelSale,
    listCustomerPayments,
    listCustomerPaymentsByCustomer,
    recordCustomerDebtPayment,
};
