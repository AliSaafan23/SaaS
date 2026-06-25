import { Op } from 'sequelize';
import {
    Branch,
    Cashier,
    Company,
    Product,
    Sale,
    SupportTicket,
    AuditLog,
    SubscriptionPlan,
    CompanySubscription,
    SubscriptionPayment,
} from '../../models/index.js';
import {
    getPlatformUsageTotals,
    getSubscriptionFinancials,
    getUsageDistributionChart,
    getTopCompanies,
    getMonthlySubscriptionRevenueChart,
} from './companyMetrics.js';
import { parseDateRange } from './dateRange.js';

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

export const getOverviewStats = async () => {
    const dayStart = startOfDay();
    const monthStart = startOfMonth();

    const [
        totalSubscribers,
        awaitingPayment,
        pendingPayments,
        desktopActiveSubs,
        mobileActiveSubs,
        totalProducts,
        salesToday,
        salesMonth,
        tenantRevenueToday,
        tenantRevenueMonth,
        activeSubscriptions,
        expiredSubscriptions,
        pendingTickets,
        usageTotals,
        subscriptionFinancials,
    ] = await Promise.all([
        Company.count(),
        Company.count({ where: { status: 'pending' } }),
        SubscriptionPayment.count({ where: { status: 'pending' } }),
        CompanySubscription.count({ where: { platform: 'desktop', status: 'active' } }),
        CompanySubscription.count({ where: { platform: 'mobile', status: 'active' } }),
        Product.count(),
        Sale.count({ where: { createdAt: { [Op.gte]: dayStart } } }),
        Sale.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
        Sale.sum('total', { where: { createdAt: { [Op.gte]: dayStart } } }),
        Sale.sum('total', { where: { createdAt: { [Op.gte]: monthStart } } }),
        CompanySubscription.count({ where: { status: 'active' } }),
        CompanySubscription.count({ where: { status: 'expired' } }),
        SupportTicket.count({ where: { status: { [Op.in]: ['open', 'in_progress'] } } }),
        getPlatformUsageTotals(),
        getSubscriptionFinancials(),
    ]);

    return {
        totalSubscribers,
        awaitingPayment,
        pendingPayments,
        desktopActiveSubs,
        mobileActiveSubs,
        totalProducts,
        totalSalesToday: salesToday,
        totalSalesMonth: salesMonth,
        totalRevenueToday: Number(tenantRevenueToday || 0),
        totalRevenueMonth: Number(tenantRevenueMonth || 0),
        activeSubscriptions,
        expiredSubscriptions,
        pendingSupportTickets: pendingTickets,
        totalBranches: usageTotals.totalBranches,
        totalCashiers: usageTotals.totalCashiers,
        totalActiveDevices: usageTotals.totalActiveDevices,
        activeCompanies: usageTotals.activeCompanies,
        activeCashiers: usageTotals.activeCashiers,
        desktopDevices: usageTotals.desktopDevices,
        mobileDevices: usageTotals.mobileDevices,
        avgDevicesPerCashier: usageTotals.avgDevicesPerCashier,
        subscriptionMrr: subscriptionFinancials.mrr,
        subscriptionMrrDesktop: subscriptionFinancials.mrrByPlatform.desktop,
        subscriptionMrrMobile: subscriptionFinancials.mrrByPlatform.mobile,
        subscriptionRevenueMonth: subscriptionFinancials.subscriptionRevenueMonth,
        subscriptionRevenueToday: subscriptionFinancials.subscriptionRevenueToday,
        subscriptionRevenueAllTime: subscriptionFinancials.subscriptionRevenueAllTime,
        paidSubscriptionsMonth: subscriptionFinancials.paidPaymentsMonth,
    };
};

export const getDailySalesChart = async (fromStr, toStr, locale = 'ar-EG') => {
    const { from, to } = parseDateRange(fromStr, toStr, { days: 7, maxDays: 90 });
    const results = [];
    const cursor = new Date(from);

    while (cursor <= to) {
        const start = new Date(cursor);
        start.setHours(0, 0, 0, 0);
        const end = new Date(cursor);
        end.setHours(23, 59, 59, 999);
        if (end > to) end.setTime(to.getTime());

        const count = await Sale.count({ where: { createdAt: { [Op.between]: [start, end] } } });
        const total = await Sale.sum('total', { where: { createdAt: { [Op.between]: [start, end] } } });

        results.push({
            label: start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }),
            sales: count,
            revenue: Number(total || 0),
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return results;
};

export const getMonthlyRevenueChart = async (fromStr, toStr, locale = 'ar-EG') => {
    const { from, to } = parseDateRange(fromStr, toStr, { months: 6, maxMonths: 24 });
    const results = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);

    while (cursor <= endMonth) {
        const start = new Date(cursor);
        start.setHours(0, 0, 0, 0);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
        const rangeEnd = monthEnd > to ? to : monthEnd;

        const total = await Sale.sum('total', { where: { createdAt: { [Op.between]: [start, rangeEnd] } } });
        results.push({
            label: start.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
            revenue: Number(total || 0),
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return results;
};

export const getSubscriptionGrowthChart = async (fromStr, toStr, lang = 'ar') => {
    const locale = lang === 'en' ? 'en-US' : 'ar-EG';
    const { from, to } = parseDateRange(fromStr, toStr, { months: 6, maxMonths: 24 });
    const plans = await SubscriptionPlan.findAll({ where: { isActive: true } });
    const data = await Promise.all(
        plans.map(async (plan) => {
            const count = await CompanySubscription.count({
                where: {
                    subscriptionPlanId: plan.id,
                    status: 'active',
                    createdAt: { [Op.between]: [from, to] },
                },
            });
            return { label: plan.getLocalizedName(lang), count };
        })
    );
    return data.filter((x) => x.count > 0);
};

export const getSubscriptionsByPlatformChart = async (fromStr, toStr) => {
    const { from, to } = parseDateRange(fromStr, toStr, { months: 6, maxMonths: 24 });
    const dateWhere = { createdAt: { [Op.between]: [from, to] } };
    const [desktop, mobile, pending] = await Promise.all([
        CompanySubscription.count({ where: { platform: 'desktop', status: 'active', ...dateWhere } }),
        CompanySubscription.count({ where: { platform: 'mobile', status: 'active', ...dateWhere } }),
        Company.count({ where: { status: 'pending', ...dateWhere } }),
    ]);
    return [
        { label: 'desktop', count: desktop },
        { label: 'mobile', count: mobile },
        { label: 'awaitingPayment', count: pending },
    ].filter((x) => x.count > 0);
};

const CHART_DEFAULTS = {
    'daily-sales': { days: 7, maxDays: 90 },
    'subscription-revenue': { months: 6, maxMonths: 24 },
    'tenant-sales': { months: 6, maxMonths: 24 },
    'platform-usage': { days: 30, maxDays: 365 },
    'subscriptions-by-plan': { months: 6, maxMonths: 24 },
    'subscriptions-by-platform': { months: 6, maxMonths: 24 },
};

export const getChartByType = async (type, fromStr, toStr, lang = 'ar') => {
    const locale = lang === 'en' ? 'en-US' : 'ar-EG';
    const defaults = CHART_DEFAULTS[type] || { days: 7, maxDays: 90 };
    const { from, to } = parseDateRange(fromStr, toStr, defaults);

    switch (type) {
        case 'daily-sales':
            return { data: await getDailySalesChart(fromStr, toStr, locale), from, to };
        case 'subscription-revenue':
            return {
                data: await getMonthlySubscriptionRevenueChart(from, to, locale),
                from,
                to,
            };
        case 'tenant-sales':
            return { data: await getMonthlyRevenueChart(fromStr, toStr, locale), from, to };
        case 'platform-usage':
            return { data: await getUsageDistributionChart(from, to), from, to };
        case 'subscriptions-by-plan':
            return { data: await getSubscriptionGrowthChart(fromStr, toStr, lang), from, to };
        case 'subscriptions-by-platform':
            return { data: await getSubscriptionsByPlatformChart(fromStr, toStr), from, to };
        default:
            return null;
    }
};

export const getChartsBundle = async (lang = 'ar') => {
    const locale = lang === 'en' ? 'en-US' : 'ar-EG';
    const subRange = parseDateRange(null, null, { months: 6 });
    const [dailySales, monthlyRevenue, subscriptionGrowth, subscriptionsByPlatform, monthlySubscriptionRevenue, usageDistribution, topCompanies] =
        await Promise.all([
            getDailySalesChart(null, null, locale),
            getMonthlyRevenueChart(null, null, locale),
            getSubscriptionGrowthChart(null, null, lang),
            getSubscriptionsByPlatformChart(null, null),
            getMonthlySubscriptionRevenueChart(subRange.from, subRange.to, locale),
            getUsageDistributionChart(),
            getTopCompanies(8),
        ]);

    return {
        dailySales,
        monthlyRevenue,
        subscriptionGrowth,
        subscriptionsByPlatform,
        monthlySubscriptionRevenue,
        usageDistribution,
        topCompanies,
    };
};

export const getRecentActivities = async () => {
    const [newSubscribers, recentPayments, sales, logs] = await Promise.all([
        Company.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5,
            attributes: ['id', 'name', 'phone', 'status', 'createdAt'],
        }),
        SubscriptionPayment.findAll({
            where: { status: 'paid' },
            order: [['paidAt', 'DESC']],
            limit: 5,
            attributes: ['id', 'amount', 'platform', 'paidAt', 'createdAt', 'companyId'],
            include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
        }),
        Sale.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5,
            attributes: ['id', 'total', 'createdAt', 'branchId'],
            include: [
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['companyId'],
                    include: [{ model: Company, as: 'company', attributes: ['name'] }],
                },
            ],
        }),
        AuditLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 8,
            attributes: ['id', 'userName', 'action', 'module', 'createdAt'],
        }),
    ]);

    return {
        newSubscribers,
        recentPayments,
        recentSales: sales,
        loginActivities: logs,
    };
};

export default {
    getOverviewStats,
    getDailySalesChart,
    getMonthlyRevenueChart,
    getSubscriptionGrowthChart,
    getSubscriptionsByPlatformChart,
    getChartByType,
    getChartsBundle,
    getRecentActivities,
};
