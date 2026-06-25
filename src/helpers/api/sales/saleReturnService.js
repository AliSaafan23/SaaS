import { Op } from 'sequelize';
import {
    sequelize,
    Sale,
    SaleReturn,
    SaleReturnItem,
} from '../../../models/index.js';
import { requireCatalogTenant } from '../inventory/catalogScope.js';
import { addStock } from '../../pos/stockService.js';
import { recordCashboxTransaction } from '../../pos/cashboxService.js';
import { roundMoney, roundQty } from './saleCalculations.js';
import {
    buildReturnLineFromSaleItem,
    computeRefundSplit,
    computeReturnTotal,
    computeRemainingReturnableGross,
    computeUpdatedPaymentAmounts,
    computeUpdatedSaleAmounts,
} from './saleReturnCalculations.js';
import { SaleScopeError } from './saleErrors.js';

const saleIncludesForReturn = [
    {
        association: 'customer',
        attributes: ['id', 'customer_code', 'name', 'phone'],
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
    { association: 'paymentMethod', required: false },
];

const returnIncludes = [
    {
        association: 'sale',
        attributes: ['id', 'invoice_no', 'invoice_date', 'total', 'status'],
        required: true,
    },
    {
        association: 'customer',
        attributes: ['id', 'name', 'phone'],
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
            { association: 'saleItem', attributes: ['id', 'qty', 'total'], required: false },
        ],
    },
];

const scopedSaleWhere = async (req, extra = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    return { branchId, ...extra };
};

const findSaleForReturn = async (req, saleId, { transaction } = {}) => {
    const where = await scopedSaleWhere(req, { id: saleId });
    return Sale.findOne({
        where,
        include: saleIncludesForReturn,
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });
};

const getReturnedQtyMap = async (saleItemIds, { transaction } = {}) => {
    if (!saleItemIds.length) return {};

    const rows = await SaleReturnItem.findAll({
        attributes: ['sale_item_id', 'qty'],
        where: { sale_item_id: { [Op.in]: saleItemIds } },
        include: [
            {
                association: 'saleReturn',
                attributes: [],
                required: true,
                include: [
                    {
                        association: 'sale',
                        attributes: [],
                        required: true,
                        where: { status: 'completed' },
                    },
                ],
            },
        ],
        transaction,
    });

    const map = {};
    for (const row of rows) {
        const id = row.sale_item_id;
        map[id] = roundQty((map[id] || 0) + roundQty(row.qty));
    }
    return map;
};

export const getReturnsMeta = async (req) => {
    const { branchId } = await requireCatalogTenant(req);
    const nextReturnNo = await generateNextReturnNo(branchId);
    return { nextReturnNo, branchId };
};

export const generateNextReturnNo = async (branchId, transaction) => {
    const last = await SaleReturn.findOne({
        where: { branchId },
        order: [['id', 'DESC']],
        attributes: ['return_no'],
        transaction,
    });

    if (!last?.return_no) return 'R-1';

    const numeric = Number.parseInt(String(last.return_no).replace(/\D/g, ''), 10);
    return `R-${Number.isFinite(numeric) && numeric > 0 ? numeric + 1 : 1}`;
};

export const getReturnedQtyMapForSaleItems = getReturnedQtyMap;

const resolveReturnRequestLines = (sale, payloadItems, returnedQtyMap) => {
    if (!Array.isArray(payloadItems) || payloadItems.length === 0) {
        throw new SaleScopeError('saleReturnItemsRequired');
    }

    const saleItemById = new Map((sale.items || []).map((item) => [item.id, item]));
    const seenSaleItems = new Set();
    const lines = [];
    const returningSaleItemIds = [];

    for (const raw of payloadItems) {
        let saleItemId = Number(raw.saleItemId ?? raw.sale_item_id);
        const productId = Number(raw.productId ?? raw.product_id);
        const returnQty = roundQty(raw.qty);

        if ((!saleItemId || !Number.isFinite(saleItemId)) && productId) {
            const productMatches = (sale.items || []).filter(
                (item) => Number(item.product_id) === productId
            );
            if (productMatches.length === 1) {
                saleItemId = productMatches[0].id;
            } else if (productMatches.length > 1) {
                throw new SaleScopeError('saleReturnAmbiguousProduct');
            }
        }

        if (!saleItemId || !Number.isFinite(returnQty) || returnQty <= 0) {
            throw new SaleScopeError('invalidSaleReturnQty');
        }

        if (seenSaleItems.has(saleItemId)) {
            throw new SaleScopeError('duplicateSaleReturnItem');
        }
        seenSaleItems.add(saleItemId);

        const saleItem = saleItemById.get(saleItemId);
        if (!saleItem) throw new SaleScopeError('saleReturnItemNotFound');

        if (productId && productId !== saleItem.product_id) {
            throw new SaleScopeError('saleReturnItemMismatch');
        }

        const soldQty = roundQty(saleItem.qty);
        const alreadyReturned = roundQty(returnedQtyMap[saleItemId] || 0);
        const returnableQty = roundQty(soldQty - alreadyReturned);

        if (returnableQty <= 0) {
            throw new SaleScopeError('saleReturnQtyExceeds');
        }

        if (returnQty > returnableQty) {
            throw new SaleScopeError('saleReturnQtyExceeds');
        }

        returningSaleItemIds.push(saleItemId);
        lines.push(buildReturnLineFromSaleItem(saleItem, returnQty));
    }

    const returnLinesGross = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
    const remainingReturnableGross = computeRemainingReturnableGross(
        sale.items,
        returnedQtyMap,
        returningSaleItemIds
    );
    const returnTotal = computeReturnTotal({
        currentSaleTotal: sale.total,
        returnLinesGross,
        remainingReturnableGross,
    });

    if (returnTotal <= 0) {
        throw new SaleScopeError('saleReturnTotalInvalid');
    }

    return { lines, returnTotal };
};

export const getSaleReturnable = async (req, saleId) => {
    const sale = await findSaleForReturn(req, saleId);
    if (!sale) throw new SaleScopeError('saleNotFound');
    if (sale.status === 'cancelled') throw new SaleScopeError('saleNotReturnable');

    const saleItemIds = (sale.items || []).map((item) => item.id);
    const returnedQtyMap = await getReturnedQtyMap(saleItemIds);

    const items = (sale.items || []).map((item) => {
        const soldQty = roundQty(item.qty);
        const returnedQty = roundQty(returnedQtyMap[item.id] || 0);
        const returnableQty = roundQty(soldQty - returnedQty);
        return {
            saleItem: item,
            soldQty,
            returnedQty,
            returnableQty,
        };
    });

    const hasReturnable = items.some((row) => row.returnableQty > 0);

    return { sale, items, hasReturnable, returnedQtyMap };
};

export const previewSaleReturn = async (req, payload) => {
    const saleId = Number(payload.saleId ?? payload.sale_id);
    if (!saleId) throw new SaleScopeError('saleNotFound');

    const sale = await findSaleForReturn(req, saleId);
    if (!sale) throw new SaleScopeError('saleNotFound');
    if (sale.status === 'cancelled') throw new SaleScopeError('saleNotReturnable');

    const saleItemIds = (sale.items || []).map((item) => item.id);
    const returnedQtyMap = await getReturnedQtyMap(saleItemIds);
    const { lines, returnTotal } = resolveReturnRequestLines(sale, payload.items, returnedQtyMap);
    const refund = computeRefundSplit(sale, returnTotal, sale.payments || []);
    const updatedSale = computeUpdatedSaleAmounts(sale, returnTotal, refund);

    return {
        sale,
        lines,
        returnTotal,
        refund,
        updatedSale,
    };
};

const findReturnInScope = async (req, returnId, { transaction } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    return SaleReturn.findOne({
        where: { id: returnId, branchId },
        include: returnIncludes,
        transaction,
    });
};

const applySalePaymentUpdates = async (sale, refund, transaction) => {
    const updates = computeUpdatedPaymentAmounts(sale.payments || [], refund);

    for (const row of updates) {
        const payment = (sale.payments || []).find((p) => p.id === row.id);
        if (!payment) continue;
        await payment.update({ amount: row.amount }, { transaction });
    }
};

export const getSaleReturnsSummary = async (saleId, { transaction } = {}) => {
    const total = await SaleReturn.sum('total', {
        where: { sale_id: saleId },
        transaction,
    });
    const count = await SaleReturn.count({
        where: { sale_id: saleId },
        transaction,
    });

    return {
        count,
        total: roundMoney(total || 0),
    };
};

const recordReturnCashOutflow = async ({
    saleReturn,
    sale,
    methodRefunds,
    branchId,
    transaction,
}) => {
    for (const row of methodRefunds) {
        if (!row.method?.affectsCashbox) continue;
        const amount = roundMoney(row.amount);
        if (amount <= 0) continue;

        await recordCashboxTransaction({
            type: 'sale_return',
            amount,
            saleId: sale.id,
            saleReturnId: saleReturn.id,
            branchId,
            description: `Sale return ${saleReturn.return_no} — invoice ${sale.invoice_no}`,
            transactionDate: saleReturn.createdAt || new Date(),
            transaction,
        });
    }
};

export const createSaleReturn = async (req, payload) => {
    const saleId = Number(payload.saleId ?? payload.sale_id);
    if (!saleId) throw new SaleScopeError('saleNotFound');

    const { branchId } = await requireCatalogTenant(req);
    const cashierId = req.cashier?.id ?? null;

    return sequelize.transaction(async (transaction) => {
        const sale = await findSaleForReturn(req, saleId, { transaction });
        if (!sale) throw new SaleScopeError('saleNotFound');
        if (sale.status === 'cancelled') throw new SaleScopeError('saleNotReturnable');

        const saleItemIds = (sale.items || []).map((item) => item.id);
        const returnedQtyMap = await getReturnedQtyMap(saleItemIds, { transaction });
        const { lines, returnTotal } = resolveReturnRequestLines(
            sale,
            payload.items,
            returnedQtyMap
        );

        const refund = computeRefundSplit(sale, returnTotal, sale.payments || []);
        const updatedSale = computeUpdatedSaleAmounts(sale, returnTotal, refund);
        const return_no = await generateNextReturnNo(branchId, transaction);

        const saleReturn = await SaleReturn.create(
            {
                sale_id: sale.id,
                customer_id: sale.customer_id,
                total: returnTotal,
                notes: payload.notes?.trim() || null,
                return_no,
                branchId,
                cashierId,
            },
            { transaction }
        );

        await SaleReturnItem.bulkCreate(
            lines.map((line) => ({
                sale_return_id: saleReturn.id,
                ...line,
            })),
            { transaction }
        );

        for (const line of lines) {
            await addStock({
                productId: line.product_id,
                qty: line.qty,
                saleReturnId: saleReturn.id,
                branchId,
                movementType: 'sale_return',
                transaction,
            });
        }

        await sale.update(updatedSale, { transaction });

        await applySalePaymentUpdates(sale, refund, transaction);

        await recordReturnCashOutflow({
            saleReturn,
            sale,
            methodRefunds: refund.methodRefunds,
            branchId,
            transaction,
        });

        return findReturnInScope(req, saleReturn.id, { transaction });
    });
};

export const listSaleReturns = async (
    req,
    { search, saleId, page = 1, limit = 50, dateFrom, dateTo } = {}
) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = { branchId };

    if (saleId) where.sale_id = Number(saleId);

    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            where.createdAt[Op.lte] = end;
        }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * pageLimit;

    const include = [...returnIncludes];
    if (search?.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [{ return_no: { [Op.like]: term } }, { '$sale.invoice_no$': { [Op.like]: term } }];
    }

    const { rows, count } = await SaleReturn.findAndCountAll({
        where,
        include,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
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

export const getSaleReturnById = async (req, returnId) => {
    const saleReturn = await findReturnInScope(req, returnId);
    if (!saleReturn) throw new SaleScopeError('saleReturnNotFound');
    return saleReturn;
};

export const listReturnsForSale = async (req, saleId) => {
    const sale = await findSaleForReturn(req, saleId);
    if (!sale) throw new SaleScopeError('saleNotFound');
    return listSaleReturns(req, { saleId: sale.id, limit: 100 });
};

export default {
    getSaleReturnable,
    previewSaleReturn,
    createSaleReturn,
    listSaleReturns,
    getSaleReturnById,
    listReturnsForSale,
    generateNextReturnNo,
    getReturnsMeta,
    getReturnedQtyMapForSaleItems,
    getSaleReturnsSummary,
};
