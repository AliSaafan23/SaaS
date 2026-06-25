import { Op, fn, col } from 'sequelize';
import {
    Sale,
    SalePayment,
    SaleReturn,
    CustomerPayment,
    CashboxTransaction,
} from '../../../models/index.js';
import { getActiveShift, getShiftInScope } from './shiftService.js';
import { requireCatalogTenant } from '../inventory/catalogScope.js';
import { roundMoney } from '../sales/saleCalculations.js';

const parseDecimal = (value) => {
    const n = Number(typeof value === 'object' && value?.toString ? value.toString() : value);
    return Number.isFinite(n) ? n : 0;
};

const buildDateRange = (dateFrom, dateTo, { exactEnd = false } = {}) => {
    const range = {};
    if (dateFrom) range[Op.gte] = new Date(dateFrom);
    if (dateTo) {
        const end = new Date(dateTo);
        if (!exactEnd) {
            end.setHours(23, 59, 59, 999);
        }
        range[Op.lte] = end;
    }
    return Object.keys(range).length ? range : null;
};

const emptySalesBlock = () => ({
    count: 0,
    grossTotal: 0,
    paidTotal: 0,
    dueTotal: 0,
    returnsTotal: 0,
    returnsCount: 0,
    netAfterReturns: 0,
    byPaymentMethod: [],
});

const emptyDrawerBlock = () => ({
    description:
        'Net physical cash expected in drawer from recorded cashbox movements during the report window',
    openingCash: 0,
    activeShift: null,
    cashSales: 0,
    cardSales: 0,
    creditSales: 0,
    salesCashIn: 0,
    saleReturnsOut: 0,
    customerPaymentsIn: 0,
    expensesOut: 0,
    purchasesOut: 0,
    deposits: 0,
    withdrawals: 0,
    expectedInDrawer: 0,
    expectedWithOpening: 0,
});

/**
 * Resolve report window: active shift (default), closed shift by id, manual dates, or none.
 */
export const resolveCashboxReportWindow = async (
    req,
    { dateFrom, dateTo, cashierId, shiftId } = {}
) => {
    const { branchId } = await requireCatalogTenant(req);
    let cashierFilter = cashierId ? Number(cashierId) : null;
    const hasManualDates = Boolean(dateFrom || dateTo);

    if (shiftId) {
        const shift = await getShiftInScope(req, shiftId);
        if (!shift) {
            return {
                branchId,
                cashierFilter,
                dateFrom: null,
                dateTo: null,
                scopeShift: null,
                scopeMode: 'none',
                exactEnd: true,
            };
        }

        return {
            branchId,
            cashierFilter: cashierFilter ?? shift.cashierId,
            dateFrom: shift.opened_at,
            dateTo: shift.closed_at || new Date(),
            scopeShift: shift,
            scopeMode: shift.closed_at ? 'closed_shift' : 'active_shift',
            exactEnd: true,
        };
    }

    if (!hasManualDates) {
        const activeShift = await getActiveShift(req, { cashierId: cashierFilter });
        if (activeShift) {
            return {
                branchId,
                cashierFilter: cashierFilter ?? activeShift.cashierId,
                dateFrom: activeShift.opened_at,
                dateTo: new Date(),
                scopeShift: activeShift,
                scopeMode: 'active_shift',
                exactEnd: true,
            };
        }

        return {
            branchId,
            cashierFilter,
            dateFrom: null,
            dateTo: null,
            scopeShift: null,
            scopeMode: 'none',
            exactEnd: true,
        };
    }

    return {
        branchId,
        cashierFilter,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        scopeShift: null,
        scopeMode: 'manual_dates',
        exactEnd: false,
    };
};

const sumCashboxByType = async (branchId, types, dateRange, { cashierId } = {}) => {
    const totals = {};

    for (const type of types) {
        const where = { branchId, type };
        if (dateRange) where.transaction_date = dateRange;

        const include = [];
        if (cashierId && type === 'sale') {
            include.push({
                association: 'sale',
                attributes: [],
                required: true,
                where: { cashierId },
            });
        }
        if (cashierId && type === 'sale_return') {
            include.push({
                association: 'saleReturn',
                attributes: [],
                required: true,
                where: { cashierId },
            });
        }

        const amount = await CashboxTransaction.sum('amount', { where, include });
        totals[type] = roundMoney(amount || 0);
    }

    return totals;
};

const aggregateSalePayments = async (branchId, dateRange, { cashierId } = {}) => {
    const saleWhere = {
        branchId,
        status: 'completed',
    };
    if (dateRange) saleWhere.invoice_date = dateRange;
    if (cashierId) saleWhere.cashierId = cashierId;

    const rows = await SalePayment.findAll({
        attributes: ['payment_method_id', [fn('SUM', col('SalePayment.amount')), 'sales_amount']],
        include: [
            {
                association: 'sale',
                attributes: [],
                required: true,
                where: saleWhere,
            },
            {
                association: 'paymentMethod',
                attributes: ['id', 'code', 'nameAr', 'nameEn', 'affectsCashbox'],
                required: false,
            },
        ],
        group: [
            'payment_method_id',
            'paymentMethod.id',
            'paymentMethod.code',
            'paymentMethod.nameAr',
            'paymentMethod.nameEn',
            'paymentMethod.affectsCashbox',
        ],
        raw: true,
    });

    return rows.map((row) => ({
        paymentMethodId: row.payment_method_id,
        code: row['paymentMethod.code'] || 'cash',
        nameAr: row['paymentMethod.nameAr'] || '',
        nameEn: row['paymentMethod.nameEn'] || '',
        affectsCashbox: Boolean(row['paymentMethod.affectsCashbox']),
        salesAmount: roundMoney(row.sales_amount),
    }));
};

const aggregateReturnTotals = async (branchId, dateRange, { cashierId } = {}) => {
    const where = { branchId };
    if (dateRange) where.createdAt = dateRange;
    if (cashierId) where.cashierId = cashierId;

    const total = await SaleReturn.sum('total', { where });
    const count = await SaleReturn.count({ where });
    return { total: roundMoney(total), count };
};

const buildScopeMeta = (window) => {
    const shift = window.scopeShift;
    return {
        mode: window.scopeMode,
        shiftId: shift?.id ?? null,
        openedAt: shift?.opened_at ?? window.dateFrom ?? null,
        closedAt: shift?.closed_at ?? null,
        isActive: Boolean(shift && !shift.closed_at),
    };
};

/**
 * Shift handover summary scoped to the active shift by default.
 */
export const getCashboxShiftSummary = async (
    req,
    { dateFrom, dateTo, cashierId, shiftId } = {}
) => {
    const window = await resolveCashboxReportWindow(req, {
        dateFrom,
        dateTo,
        cashierId,
        shiftId,
    });

    const { branchId, cashierFilter, scopeShift, scopeMode } = window;

    if (scopeMode === 'none') {
        return {
            period: { dateFrom: null, dateTo: null },
            scope: buildScopeMeta(window),
            branchId,
            cashierId: cashierFilter,
            sales: emptySalesBlock(),
            credit: {
                newCreditSales: 0,
                outstandingFromPeriodSales: 0,
                customerPaymentsCollected: 0,
            },
            drawer: emptyDrawerBlock(),
            customerPayments: { total: 0, byPaymentMethod: [] },
        };
    }

    const saleDateRange = buildDateRange(window.dateFrom, window.dateTo, {
        exactEnd: window.exactEnd,
    });

    const cashboxByType = await sumCashboxByType(
        branchId,
        [
            'sale',
            'sale_return',
            'customer_payment',
            'expense',
            'purchase',
            'deposit',
            'withdraw',
        ],
        saleDateRange,
        { cashierId: cashierFilter }
    );

    const salesIn = roundMoney(cashboxByType.sale || 0);
    const returnsOut = roundMoney(cashboxByType.sale_return || 0);
    const customerPaymentsIn = roundMoney(cashboxByType.customer_payment || 0);
    const expensesOut = roundMoney(cashboxByType.expense || 0);
    const purchasesOut = roundMoney(cashboxByType.purchase || 0);
    const deposits = roundMoney(cashboxByType.deposit || 0);
    const withdrawals = roundMoney(cashboxByType.withdraw || 0);

    const expectedInDrawer =
        salesIn +
        customerPaymentsIn +
        deposits -
        returnsOut -
        expensesOut -
        purchasesOut -
        withdrawals;

    const saleWhere = {
        branchId,
        status: 'completed',
    };
    if (saleDateRange) saleWhere.invoice_date = saleDateRange;
    if (cashierFilter) saleWhere.cashierId = cashierFilter;

    const salesCount = await Sale.count({ where: saleWhere });
    const salesGross = roundMoney((await Sale.sum('total', { where: saleWhere })) || 0);
    const salesPaid = roundMoney((await Sale.sum('paid_amount', { where: saleWhere })) || 0);
    const salesDue = roundMoney((await Sale.sum('due_amount', { where: saleWhere })) || 0);

    const paymentBreakdown = await aggregateSalePayments(branchId, saleDateRange, {
        cashierId: cashierFilter,
    });

    const returnsSummary = await aggregateReturnTotals(branchId, saleDateRange, {
        cashierId: cashierFilter,
    });

    const creditSalesAmount = roundMoney(
        paymentBreakdown
            .filter((row) => row.code === 'credit')
            .reduce((sum, row) => sum + row.salesAmount, 0)
    );

    const cashSalesAmount = roundMoney(
        paymentBreakdown
            .filter((row) => row.code === 'cash')
            .reduce((sum, row) => sum + row.salesAmount, 0)
    );

    const cardSalesAmount = roundMoney(
        paymentBreakdown
            .filter((row) => row.code === 'card')
            .reduce((sum, row) => sum + row.salesAmount, 0)
    );

    const customerPaymentRows = await CustomerPayment.findAll({
        attributes: ['payment_method_id', [fn('SUM', col('CustomerPayment.amount')), 'total']],
        where: saleDateRange ? { payment_date: saleDateRange } : {},
        include: [
            {
                association: 'paymentMethod',
                attributes: ['id', 'code', 'nameAr', 'nameEn', 'affectsCashbox'],
                required: false,
            },
            {
                association: 'customer',
                attributes: [],
                required: true,
                where: { branchId },
            },
        ],
        group: [
            'payment_method_id',
            'paymentMethod.id',
            'paymentMethod.code',
            'paymentMethod.nameAr',
            'paymentMethod.nameEn',
            'paymentMethod.affectsCashbox',
        ],
        raw: true,
    });

    const customerPaymentsTotal = roundMoney(
        customerPaymentRows.reduce((sum, row) => sum + parseDecimal(row.total), 0)
    );

    const openingCash = roundMoney(scopeShift?.opening_cash || 0);

    return {
        period: {
            dateFrom: window.dateFrom ? new Date(window.dateFrom).toISOString() : null,
            dateTo: window.dateTo ? new Date(window.dateTo).toISOString() : null,
        },
        scope: buildScopeMeta(window),
        branchId,
        cashierId: cashierFilter,
        sales: {
            count: salesCount,
            grossTotal: salesGross,
            paidTotal: salesPaid,
            dueTotal: salesDue,
            returnsTotal: returnsSummary.total,
            returnsCount: returnsSummary.count,
            netAfterReturns: roundMoney(salesGross - returnsSummary.total),
            byPaymentMethod: paymentBreakdown,
        },
        credit: {
            newCreditSales: creditSalesAmount,
            outstandingFromPeriodSales: salesDue,
            customerPaymentsCollected: customerPaymentsTotal,
        },
        drawer: {
            description:
                'Net physical cash expected in drawer from recorded cashbox movements during the report window',
            openingCash,
            activeShift: scopeShift
                ? {
                      id: scopeShift.id,
                      opened_at: scopeShift.opened_at,
                      closed_at: scopeShift.closed_at,
                      opening_cash: openingCash,
                  }
                : null,
            cashSales: cashSalesAmount,
            cardSales: cardSalesAmount,
            creditSales: creditSalesAmount,
            salesCashIn: salesIn,
            saleReturnsOut: returnsOut,
            customerPaymentsIn,
            expensesOut,
            purchasesOut,
            deposits,
            withdrawals,
            expectedInDrawer: roundMoney(expectedInDrawer),
            expectedWithOpening: roundMoney(expectedInDrawer + openingCash),
        },
        customerPayments: {
            total: customerPaymentsTotal,
            byPaymentMethod: customerPaymentRows.map((row) => ({
                paymentMethodId: row.payment_method_id,
                code: row['paymentMethod.code'],
                nameAr: row['paymentMethod.nameAr'],
                nameEn: row['paymentMethod.nameEn'],
                affectsCashbox: Boolean(row['paymentMethod.affectsCashbox']),
                amount: roundMoney(row.total),
            })),
        },
    };
};

export default { getCashboxShiftSummary, resolveCashboxReportWindow };
