import { Op } from 'sequelize';
import { Sale, SaleReturn } from '../../../models/index.js';
import { roundMoney } from '../sales/saleCalculations.js';
import {
    getCashboxShiftSummary,
    resolveCashboxReportWindow,
} from '../cashbox/cashboxSummaryService.js';

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

export const getDailySalesReport = async (req, { dateFrom, dateTo, cashierId, shiftId } = {}) => {
    const window = await resolveCashboxReportWindow(req, {
        dateFrom,
        dateTo,
        cashierId,
        shiftId,
    });

    const saleDateRange =
        window.scopeMode === 'none'
            ? null
            : buildDateRange(window.dateFrom, window.dateTo, { exactEnd: window.exactEnd });

    const saleWhere = { branchId: window.branchId, status: 'completed' };
    if (saleDateRange) saleWhere.invoice_date = saleDateRange;
    if (window.cashierFilter) saleWhere.cashierId = window.cashierFilter;

    const returnWhere = { branchId: window.branchId };
    if (saleDateRange) returnWhere.createdAt = saleDateRange;
    if (window.cashierFilter) returnWhere.cashierId = window.cashierFilter;

    const [salesCount, salesGross, salesNet, returnsCount, returnsTotal, shiftSummary] =
        await Promise.all([
            window.scopeMode === 'none' ? 0 : Sale.count({ where: saleWhere }),
            window.scopeMode === 'none' ? 0 : Sale.sum('total', { where: saleWhere }),
            window.scopeMode === 'none' ? 0 : Sale.sum('paid_amount', { where: saleWhere }),
            window.scopeMode === 'none' ? 0 : SaleReturn.count({ where: returnWhere }),
            window.scopeMode === 'none' ? 0 : SaleReturn.sum('total', { where: returnWhere }),
            getCashboxShiftSummary(req, { dateFrom, dateTo, cashierId, shiftId }),
        ]);

    return {
        period: shiftSummary.period,
        scope: shiftSummary.scope,
        branchId: window.branchId,
        cashierId: window.cashierFilter,
        sales: {
            count: salesCount,
            grossTotal: roundMoney(salesGross || 0),
            collectedTotal: roundMoney(salesNet || 0),
        },
        returns: {
            count: returnsCount,
            total: roundMoney(returnsTotal || 0),
        },
        netSales: roundMoney((salesGross || 0) - (returnsTotal || 0)),
        drawer: shiftSummary.drawer,
        credit: shiftSummary.credit,
        customerPayments: shiftSummary.customerPayments,
    };
};

export default { getDailySalesReport };
