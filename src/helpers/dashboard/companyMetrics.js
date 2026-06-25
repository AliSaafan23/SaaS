import { Op, fn, col } from 'sequelize';
import {
    Branch,
    Cashier,
    Company,
    CompanySubscription,
    Sale,
    SubscriptionPayment,
    SubscriptionPlan,
    UserToken,
} from '../../models/index.js';
import { isSubscriptionValid } from './subscriptionService.js';

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

export const planToMonthlyMrr = (price, billingCycle) => {
    const p = Number(price) || 0;
    if (billingCycle === 'annual') return Math.round((p / 12) * 100) / 100;
    if (billingCycle === 'lifetime') return 0;
    return p;
};

const emptyMetrics = () => ({
    branchCount: 0,
    cashierCount: 0,
    activeDeviceCount: 0,
    salesMonth: 0,
    salesMonthCount: 0,
    salesTotal: 0,
    subscriptionPaidTotal: 0,
    mrr: 0,
});

const mapCounts = (rows, keyField = 'companyId') => {
    const map = new Map();
    for (const row of rows) {
        const id = Number(row[keyField]);
        if (!Number.isFinite(id)) continue;
        map.set(id, Number(row.count) || 0);
    }
    return map;
};

export const getBulkCompanyMetrics = async (companyIds = []) => {
    const ids = [...new Set(companyIds.map(Number).filter(Boolean))];
    const base = {};
    for (const id of ids) base[id] = emptyMetrics();

    if (!ids.length) return base;

    const monthStart = startOfMonth();

    const [branchRows, cashierRows, deviceRows, salesMonthRows, salesTotalRows, paidRows] =
        await Promise.all([
            Branch.findAll({
                attributes: ['companyId', [fn('COUNT', col('id')), 'count']],
                where: { companyId: { [Op.in]: ids } },
                group: ['companyId'],
                raw: true,
            }),
            Cashier.findAll({
                attributes: [[col('branch.companyId'), 'companyId'], [fn('COUNT', col('Cashier.id')), 'count']],
                include: [
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: [],
                        where: { companyId: { [Op.in]: ids } },
                        required: true,
                    },
                ],
                group: [col('branch.companyId')],
                raw: true,
            }),
            UserToken.findAll({
                attributes: [
                    [col('cashier.branch.companyId'), 'companyId'],
                    [fn('COUNT', col('UserToken.id')), 'count'],
                ],
                where: { userRef: 'Cashier', expired: false },
                include: [
                    {
                        model: Cashier,
                        as: 'cashier',
                        attributes: [],
                        required: true,
                        include: [
                            {
                                model: Branch,
                                as: 'branch',
                                attributes: [],
                                where: { companyId: { [Op.in]: ids } },
                                required: true,
                            },
                        ],
                    },
                ],
                group: [col('cashier.branch.companyId')],
                raw: true,
            }),
            Sale.findAll({
                attributes: [
                    [col('branch.companyId'), 'companyId'],
                    [fn('SUM', col('Sale.total')), 'total'],
                    [fn('COUNT', col('Sale.id')), 'count'],
                ],
                where: { createdAt: { [Op.gte]: monthStart } },
                include: [
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: [],
                        where: { companyId: { [Op.in]: ids } },
                        required: true,
                    },
                ],
                group: [col('branch.companyId')],
                raw: true,
            }),
            Sale.findAll({
                attributes: [
                    [col('branch.companyId'), 'companyId'],
                    [fn('SUM', col('Sale.total')), 'total'],
                ],
                include: [
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: [],
                        where: { companyId: { [Op.in]: ids } },
                        required: true,
                    },
                ],
                group: [col('branch.companyId')],
                raw: true,
            }),
            SubscriptionPayment.findAll({
                attributes: ['companyId', [fn('SUM', col('amount')), 'total']],
                where: { companyId: { [Op.in]: ids }, status: 'paid' },
                group: ['companyId'],
                raw: true,
            }),
        ]);

    const branchMap = mapCounts(branchRows);
    const cashierMap = mapCounts(cashierRows);
    const deviceMap = mapCounts(deviceRows);

    for (const id of ids) {
        base[id].branchCount = branchMap.get(id) || 0;
        base[id].cashierCount = cashierMap.get(id) || 0;
        base[id].activeDeviceCount = deviceMap.get(id) || 0;
    }

    for (const row of salesMonthRows) {
        const id = Number(row.companyId);
        if (!base[id]) continue;
        base[id].salesMonth = Number(row.total) || 0;
        base[id].salesMonthCount = Number(row.count) || 0;
    }

    for (const row of salesTotalRows) {
        const id = Number(row.companyId);
        if (!base[id]) continue;
        base[id].salesTotal = Number(row.total) || 0;
    }

    for (const row of paidRows) {
        const id = Number(row.companyId);
        if (!base[id]) continue;
        base[id].subscriptionPaidTotal = Number(row.total) || 0;
    }

    const activeSubs = await CompanySubscription.findAll({
        where: { companyId: { [Op.in]: ids }, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });

    for (const sub of activeSubs) {
        if (!isSubscriptionValid(sub)) continue;
        const id = sub.companyId;
        if (!base[id]) continue;
        const plan = sub.subscriptionPlan;
        if (!plan) continue;
        base[id].mrr += planToMonthlyMrr(plan.price, plan.billingCycle);
    }

    return base;
};

export const getPlatformUsageTotals = async () => {
    const [totalBranches, totalCashiers, totalActiveDevices, activeCompanies, desktopDevices, mobileDevices, activeCashiers] =
        await Promise.all([
            Branch.count(),
            Cashier.count({
                include: [{ model: Branch, as: 'branch', required: true, attributes: [] }],
            }),
            UserToken.count({ where: { userRef: 'Cashier', expired: false } }),
            Company.count({ where: { status: 'active' } }),
            UserToken.count({
                where: { userRef: 'Cashier', expired: false, platform: 'desktop' },
            }),
            UserToken.count({
                where: { userRef: 'Cashier', expired: false, platform: 'mobile' },
            }),
            Cashier.count({
                where: { status: 'active', active: true },
                include: [{ model: Branch, as: 'branch', required: true, attributes: [] }],
            }),
        ]);

    const avgDevicesPerCashier =
        totalCashiers > 0 ? Math.round((totalActiveDevices / totalCashiers) * 10) / 10 : 0;

    return {
        totalBranches,
        totalCashiers,
        totalActiveDevices,
        activeCompanies,
        activeCashiers,
        desktopDevices,
        mobileDevices,
        avgDevicesPerCashier,
    };
};

export const getSubscriptionFinancials = async () => {
    const dayStart = startOfDay();
    const monthStart = startOfMonth();

    const activeSubs = await CompanySubscription.findAll({
        where: { status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });
    const validSubs = activeSubs.filter(isSubscriptionValid);

    let mrr = 0;
    const mrrByPlatform = { desktop: 0, mobile: 0 };
    for (const sub of validSubs) {
        const plan = sub.subscriptionPlan;
        if (!plan) continue;
        const monthly = planToMonthlyMrr(plan.price, plan.billingCycle);
        mrr += monthly;
        if (mrrByPlatform[sub.platform] != null) {
            mrrByPlatform[sub.platform] += monthly;
        }
    }

    const [revenueMonth, revenueToday, revenueAllTime, paidPaymentsMonth] = await Promise.all([
        SubscriptionPayment.sum('amount', {
            where: { status: 'paid', paidAt: { [Op.gte]: monthStart } },
        }),
        SubscriptionPayment.sum('amount', {
            where: { status: 'paid', paidAt: { [Op.gte]: dayStart } },
        }),
        SubscriptionPayment.sum('amount', { where: { status: 'paid' } }),
        SubscriptionPayment.count({
            where: { status: 'paid', paidAt: { [Op.gte]: monthStart } },
        }),
    ]);

    return {
        mrr: Math.round(mrr * 100) / 100,
        mrrByPlatform,
        activeSubscriptionCount: validSubs.length,
        subscriptionRevenueMonth: Number(revenueMonth || 0),
        subscriptionRevenueToday: Number(revenueToday || 0),
        subscriptionRevenueAllTime: Number(revenueAllTime || 0),
        paidPaymentsMonth,
    };
};

export const getMonthlySubscriptionRevenueChart = async (from, to, locale = 'ar-EG') => {
    const results = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);

    while (cursor <= endMonth) {
        const start = new Date(cursor);
        start.setHours(0, 0, 0, 0);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
        const rangeEnd = monthEnd > to ? to : monthEnd;

        const total = await SubscriptionPayment.sum('amount', {
            where: {
                status: 'paid',
                paidAt: { [Op.between]: [start, rangeEnd] },
            },
        });

        results.push({
            label: start.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
            revenue: Number(total || 0),
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return results;
};

export const getUsageDistributionChart = async (from = null, to = null) => {
    if (!from || !to) {
        const totals = await getPlatformUsageTotals();
        return [
            { label: 'branches', count: totals.totalBranches },
            { label: 'cashiers', count: totals.totalCashiers },
            { label: 'devices', count: totals.totalActiveDevices },
        ];
    }

    const dateWhere = { createdAt: { [Op.between]: [from, to] } };
    const [branches, cashiers, devices] = await Promise.all([
        Branch.count({ where: dateWhere }),
        Cashier.count({ where: dateWhere }),
        UserToken.count({ where: { ...dateWhere, userRef: 'Cashier' } }),
    ]);

    return [
        { label: 'branches', count: branches },
        { label: 'cashiers', count: cashiers },
        { label: 'devices', count: devices },
    ];
};

export const getTopCompanies = async (limit = 8) => {
    const companies = await Company.findAll({
        order: [['id', 'DESC']],
        limit: Math.min(limit, 20),
        attributes: ['id', 'name', 'phone', 'status', 'createdAt'],
    });

    const ids = companies.map((c) => c.id);
    const metrics = await getBulkCompanyMetrics(ids);

    return companies
        .map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            status: c.status,
            createdAt: c.createdAt,
            ...metrics[c.id],
        }))
        .sort((a, b) => b.mrr - a.mrr || b.salesMonth - a.salesMonth);
};

export const getCompanyDetail = async (companyId, lang = 'ar') => {
    const company = await Company.findByPk(companyId, {
        include: [
            {
                model: CompanySubscription,
                as: 'subscriptions',
                include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
            },
            {
                association: 'subscriptionPayments',
                separate: true,
                limit: 10,
                order: [['id', 'DESC']],
                include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
            },
        ],
    });

    if (!company) return null;

    const metrics = (await getBulkCompanyMetrics([companyId]))[companyId] || emptyMetrics();

    const branches = await Branch.findAll({
        where: { companyId },
        attributes: ['id', 'name', 'phone', 'status', 'createdAt'],
        order: [['id', 'ASC']],
    });

    const cashiers = await Cashier.findAll({
        include: [
            {
                model: Branch,
                as: 'branch',
                where: { companyId },
                required: true,
                attributes: ['id', 'name'],
            },
        ],
        attributes: ['id', 'name', 'phone', 'email', 'status', 'active', 'createdAt'],
        order: [['id', 'ASC']],
        limit: 100,
    });

    const cashierIds = cashiers.map((c) => c.id);
    let devicesByCashier = {};
    if (cashierIds.length) {
        const deviceRows = await UserToken.findAll({
            attributes: ['userId', 'platform', [fn('COUNT', col('id')), 'count']],
            where: { userRef: 'Cashier', userId: { [Op.in]: cashierIds }, expired: false },
            group: ['userId', 'platform'],
            raw: true,
        });
        for (const row of deviceRows) {
            const cid = row.userId;
            if (!devicesByCashier[cid]) devicesByCashier[cid] = { total: 0, byPlatform: {} };
            const n = Number(row.count) || 0;
            devicesByCashier[cid].total += n;
            devicesByCashier[cid].byPlatform[row.platform] = n;
        }
    }

    const mapSub = (s) => {
        const plan = s.subscriptionPlan;
        return {
            id: s.id,
            platform: s.platform,
            status: s.status,
            startsAt: s.startsAt,
            expiresAt: s.expiresAt,
            monthlyMrr: plan ? planToMonthlyMrr(plan.price, plan.billingCycle) : 0,
            plan: plan
                ? {
                      id: plan.id,
                      name: plan.getLocalizedName?.(lang) || plan.name?.[lang] || plan.name?.ar,
                      price: plan.price,
                      billingCycle: plan.billingCycle,
                      maxBranches: plan.maxBranches,
                      maxDevices: plan.maxDevices,
                      maxProducts: plan.maxProducts,
                  }
                : null,
        };
    };

    return {
        id: company.id,
        name: company.name,
        phone: company.phone,
        address: company.address,
        status: company.status,
        createdAt: company.createdAt,
        metrics,
        subscriptions: (company.subscriptions || []).map(mapSub),
        recentPayments: (company.subscriptionPayments || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            platform: p.platform,
            paidAt: p.paidAt,
            merchantOrderId: p.merchantOrderId,
            planName:
                p.subscriptionPlan?.getLocalizedName?.(lang) ||
                p.subscriptionPlan?.name?.[lang] ||
                p.subscriptionPlan?.name?.ar ||
                null,
        })),
        branches: branches.map((b) => ({
            id: b.id,
            name: b.name,
            phone: b.phone,
            status: b.status,
        })),
        cashiers: cashiers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            status: c.status,
            active: c.active,
            branchName: c.branch?.name || null,
            activeDevices: devicesByCashier[c.id]?.total || 0,
            devicesByPlatform: devicesByCashier[c.id]?.byPlatform || {},
        })),
    };
};

export default {
    planToMonthlyMrr,
    getBulkCompanyMetrics,
    getPlatformUsageTotals,
    getSubscriptionFinancials,
    getMonthlySubscriptionRevenueChart,
    getUsageDistributionChart,
    getTopCompanies,
    getCompanyDetail,
};
