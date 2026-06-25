import { Op, fn, col } from 'sequelize';
import {
    Branch,
    Cashier,
    Product,
    Sale,
    SaleItem,
    SaleReturn,
    Customer,
} from '../../models/index.js';
import { parseDateRange } from '../dashboard/dateRange.js';
import { getActiveBranchIds, resolveBranchFilter, branchIdWhere } from './branchScope.js';

const startOfDay = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

const num = (v) => Number(v || 0);

const buildSaleWhere = (from, to, branchIds, branchId) => ({
    status: 'completed',
    invoice_date: { [Op.between]: [from, to] },
    branchId: branchIdWhere(branchIds, branchId),
});

const aggregateSaleTotals = async (where) => {
    const [revenue, invoices] = await Promise.all([
        Sale.sum('total', { where }),
        Sale.count({ where }),
    ]);
    return { revenue: num(revenue), invoices };
};

const aggregateReturnTotals = async (where) => {
    const [total, count] = await Promise.all([
        SaleReturn.sum('total', { where }),
        SaleReturn.count({ where }),
    ]);
    return { total: num(total), count };
};

const buildReturnWhere = (from, to, branchIds, branchId) => ({
    createdAt: { [Op.between]: [from, to] },
    branchId: branchIdWhere(branchIds, branchId),
});

const aggregateProfit = async (saleWhere) => {
    const rows = await SaleItem.findAll({
        attributes: ['total', 'qty'],
        include: [
            {
                model: Sale,
                as: 'sale',
                attributes: [],
                where: saleWhere,
                required: true,
            },
            {
                model: Product,
                as: 'product',
                attributes: ['cost_price'],
                required: false,
            },
        ],
        raw: true,
        nest: true,
    });

    return rows.reduce((sum, row) => {
        const revenue = num(row.total);
        const cost = num(row.qty) * num(row.product?.cost_price);
        return sum + (revenue - cost);
    }, 0);
};

export const getBranchOptions = async (companyId) => {
    const rows = await Branch.findAll({
        where: { companyId, status: { [Op.ne]: 'inactive' } },
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
    });
    return rows.map((b) => ({ id: b.id, name: b.name }));
};

export const getOverview = async (companyId, branchIdRaw, fromStr, toStr, lang = 'ar') => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });

    const dayStart = startOfDay();
    const monthStart = startOfMonth();
    const todayWhere = buildSaleWhere(dayStart, new Date(), branchIds, branchId);
    const monthWhere = buildSaleWhere(monthStart, new Date(), branchIds, branchId);
    const periodWhere = buildSaleWhere(from, to, branchIds, branchId);

    const [
        todayTotals,
        monthTotals,
        periodTotals,
        periodProfit,
        periodReturns,
        branchCount,
        cashierCount,
        productCount,
        branches,
    ] = await Promise.all([
        aggregateSaleTotals(todayWhere),
        aggregateSaleTotals(monthWhere),
        aggregateSaleTotals(periodWhere),
        aggregateProfit(periodWhere),
        aggregateReturnTotals(buildReturnWhere(from, to, branchIds, branchId)),
        Branch.count({ where: { companyId, status: { [Op.ne]: 'inactive' } } }),
        Cashier.count({
            include: [
                {
                    model: Branch,
                    as: 'branch',
                    attributes: [],
                    where: {
                        companyId,
                        ...(branchId ? { id: branchId } : {}),
                    },
                    required: true,
                },
            ],
            where: { status: { [Op.ne]: 'delete' } },
        }),
        Product.count({ where: { companyId, status: 'active' } }),
        getBranchOptions(companyId),
    ]);

    return {
        revenueToday: todayTotals.revenue,
        invoicesToday: todayTotals.invoices,
        revenueMonth: monthTotals.revenue,
        invoicesMonth: monthTotals.invoices,
        revenuePeriod: periodTotals.revenue,
        invoicesPeriod: periodTotals.invoices,
        profitPeriod: periodProfit,
        returnsPeriod: periodReturns,
        branchCount,
        cashierCount,
        productCount,
        branches,
        period: { from, to },
        branchId,
        lang,
    };
};

export const getDailySalesChart = async (companyId, branchIdRaw, fromStr, toStr, locale = 'ar-EG') => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 7, maxDays: 90 });

    const results = [];
    const cursor = new Date(from);

    while (cursor <= to) {
        const start = new Date(cursor);
        start.setHours(0, 0, 0, 0);
        const end = new Date(cursor);
        end.setHours(23, 59, 59, 999);
        if (end > to) end.setTime(to.getTime());

        const where = buildSaleWhere(start, end, branchIds, branchId);
        const totals = await aggregateSaleTotals(where);

        results.push({
            label: start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }),
            sales: totals.invoices,
            revenue: totals.revenue,
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return results;
};

export const getProfitChart = async (companyId, branchIdRaw, fromStr, toStr, locale = 'ar-EG') => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 90 });

    const results = [];
    const cursor = new Date(from);

    while (cursor <= to) {
        const start = new Date(cursor);
        start.setHours(0, 0, 0, 0);
        const end = new Date(cursor);
        end.setHours(23, 59, 59, 999);
        if (end > to) end.setTime(to.getTime());

        const where = buildSaleWhere(start, end, branchIds, branchId);
        const [revenue, profit] = await Promise.all([
            Sale.sum('total', { where }),
            aggregateProfit(where),
        ]);

        results.push({
            label: start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }),
            revenue: num(revenue),
            profit,
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return results;
};

export const getSalesByBranchChart = async (companyId, fromStr, toStr) => {
    const branchIds = await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });
    if (!branchIds.length) return [];

    const rows = await Sale.findAll({
        attributes: [
            'branchId',
            [fn('SUM', col('Sale.total')), 'revenue'],
            [fn('COUNT', col('Sale.id')), 'invoices'],
        ],
        where: buildSaleWhere(from, to, branchIds, null),
        group: ['branchId'],
        raw: true,
    });

    const branches = await Branch.findAll({
        where: { id: { [Op.in]: branchIds } },
        attributes: ['id', 'name'],
    });
    const nameMap = new Map(branches.map((b) => [b.id, b.name]));

    return rows
        .map((r) => ({
            branchId: r.branchId,
            label: nameMap.get(r.branchId) || `#${r.branchId}`,
            revenue: num(r.revenue),
            invoices: num(r.invoices),
        }))
        .sort((a, b) => b.revenue - a.revenue);
};

export const getInvoicesByBranchChart = async (companyId, fromStr, toStr) => {
    const data = await getSalesByBranchChart(companyId, fromStr, toStr);
    return data.map((r) => ({ label: r.label, branchId: r.branchId, count: r.invoices }));
};

export const getBranchesSummary = async (companyId, fromStr, toStr) => {
    const branchIds = await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });

    const branches = await Branch.findAll({
        where: { id: { [Op.in]: branchIds } },
        include: [
            {
                model: Cashier,
                as: 'cashiers',
                attributes: ['id'],
                where: { status: { [Op.ne]: 'delete' } },
                required: false,
            },
        ],
        order: [['name', 'ASC']],
    });

    const summaries = await Promise.all(
        branches.map(async (branch) => {
            const where = buildSaleWhere(from, to, branchIds, branch.id);
            const [totals, profit] = await Promise.all([
                aggregateSaleTotals(where),
                aggregateProfit(where),
            ]);
            return {
                id: branch.id,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                status: branch.status,
                cashierCount: branch.cashiers?.length || 0,
                revenue: totals.revenue,
                profit,
                invoices: totals.invoices,
            };
        })
    );

    return summaries.sort((a, b) => b.revenue - a.revenue);
};

export const getTopCustomersChart = async (companyId, branchIdRaw, fromStr, toStr, limit = 10) => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });

    const rows = await Sale.findAll({
        attributes: [
            'customer_id',
            [fn('SUM', col('Sale.total')), 'revenue'],
            [fn('COUNT', col('Sale.id')), 'invoices'],
        ],
        where: {
            ...buildSaleWhere(from, to, branchIds, branchId),
            customer_id: { [Op.ne]: null },
        },
        include: [
            {
                model: Customer,
                as: 'customer',
                attributes: ['name'],
                required: true,
            },
        ],
        group: ['customer_id', 'customer.id', 'customer.name'],
        order: [[fn('SUM', col('Sale.total')), 'DESC']],
        limit,
        raw: true,
        nest: true,
    });

    return rows.map((r) => ({
        customerId: r.customer_id,
        label: r.customer?.name || `#${r.customer_id}`,
        revenue: num(r.revenue),
        invoices: num(r.invoices),
    }));
};

export const getTopProductsChart = async (companyId, branchIdRaw, fromStr, toStr, limit = 10) => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });

    const rows = await SaleItem.findAll({
        attributes: [
            'product_id',
            [fn('SUM', col('SaleItem.qty')), 'qty'],
            [fn('SUM', col('SaleItem.total')), 'revenue'],
        ],
        include: [
            {
                model: Sale,
                as: 'sale',
                attributes: [],
                where: buildSaleWhere(from, to, branchIds, branchId),
                required: true,
            },
            {
                model: Product,
                as: 'product',
                attributes: ['name'],
                required: false,
            },
        ],
        group: ['product_id', 'product.id', 'product.name'],
        order: [[fn('SUM', col('SaleItem.qty')), 'DESC']],
        limit,
        raw: true,
        nest: true,
    });

    return rows.map((r) => ({
        productId: r.product_id,
        label: r.product?.name || `#${r.product_id}`,
        qty: num(r.qty),
        revenue: num(r.revenue),
    }));
};

const CHART_DEFAULTS = {
    'daily-sales': { days: 7, maxDays: 90 },
    profit: { days: 30, maxDays: 90 },
    'sales-by-branch': { days: 30, maxDays: 366 },
    'invoices-by-branch': { days: 30, maxDays: 366 },
    'top-products': { days: 30, maxDays: 366 },
    'top-customers': { days: 30, maxDays: 366 },
};

export const getChartByType = async (type, companyId, branchIdRaw, fromStr, toStr, lang = 'ar') => {
    const locale = lang === 'en' ? 'en-US' : 'ar-EG';
    const defaults = CHART_DEFAULTS[type] || { days: 7, maxDays: 90 };
    const { from, to } = parseDateRange(fromStr, toStr, defaults);

    let data;
    switch (type) {
        case 'daily-sales':
            data = await getDailySalesChart(companyId, branchIdRaw, fromStr, toStr, locale);
            break;
        case 'profit':
            data = await getProfitChart(companyId, branchIdRaw, fromStr, toStr, locale);
            break;
        case 'sales-by-branch':
            data = await getSalesByBranchChart(companyId, fromStr, toStr);
            break;
        case 'invoices-by-branch':
            data = await getInvoicesByBranchChart(companyId, fromStr, toStr);
            break;
        case 'top-products':
            data = await getTopProductsChart(companyId, branchIdRaw, fromStr, toStr);
            break;
        case 'top-customers':
            data = await getTopCustomersChart(companyId, branchIdRaw, fromStr, toStr);
            break;
        default:
            return null;
    }

    return { data, from, to };
};

export default {
    getOverview,
    getBranchOptions,
    getDailySalesChart,
    getProfitChart,
    getSalesByBranchChart,
    getInvoicesByBranchChart,
    getBranchesSummary,
    getTopProductsChart,
    getTopCustomersChart,
    getChartByType,
};
