import i18n from 'i18n';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { errorHandler } from '../../helpers/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import {
    getSubscriberStats,
    listPendingPayments,
    activateCompanySubscription,
    suspendCompanySubscription,
} from '../../helpers/dashboard/subscriptionService.js';
import {
    getBulkCompanyMetrics,
    getPlatformUsageTotals,
    getSubscriptionFinancials,
    getCompanyDetail,
} from '../../helpers/dashboard/companyMetrics.js';
import { Company, CompanySubscription, SubscriptionPlan, Country } from '../../models/index.js';

const companyInclude = [
    {
        model: Country,
        as: 'country',
        required: false,
    },
    {
        model: CompanySubscription,
        as: 'subscriptions',
        required: false,
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    },
    {
        association: 'subscriptionPayments',
        required: false,
        separate: true,
        where: { status: 'pending' },
        limit: 1,
        order: [['id', 'DESC']],
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    },
];

const filterCompanies = (rows, filter) => {
    if (filter === 'no_subscription') {
        return rows.filter((r) => !r.subscriptions?.some((s) => s.status === 'active'));
    }
    return rows;
};

const dashboardLang = (req) => (req.headers.lang === 'en' ? 'en' : 'ar');

const loadCompanies = async (req) => {
    const { filter, countryId } = req.query;
    const companyWhere = {};
    const lang = dashboardLang(req);

    if (filter === 'pending') {
        companyWhere.status = 'pending';
    } else if (filter === 'active') {
        companyWhere.status = 'active';
    }

    if (countryId) {
        companyWhere.countryId = Number(countryId);
    }

    const companies = await Company.findAll({
        where: companyWhere,
        include: companyInclude,
        order: [['id', 'DESC']],
        limit: Math.min(Number(req.query.limit) || 200, 500),
    });

    const ids = companies.map((c) => c.id);
    const metricsMap = await getBulkCompanyMetrics(ids);

    return filterCompanies(
        companies.map((c) => returnObject.companySubscriber(c, metricsMap[c.id], lang)),
        filter
    );
};

export default {
    stats: async (req, res) => {
        const [stats, usage, financials] = await Promise.all([
            getSubscriberStats(),
            getPlatformUsageTotals(),
            getSubscriptionFinancials(),
        ]);
        res.send(
            new ApiResponse('success', i18n.__('dataFetched'), 200, {
                ...stats,
                ...usage,
                subscriptionMrr: financials.mrr,
                subscriptionRevenueMonth: financials.subscriptionRevenueMonth,
            })
        );
    },

    list: async (req, res) => {
        const rows = await loadCompanies(req);
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, rows));
    },

    pendingPayments: async (req, res) => {
        const payments = await listPendingPayments(Number(req.query.limit) || 100);
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                payments.map((p) => returnObject.subscriptionPayment(p))
            )
        );
    },

    companyList: async (req, res) => {
        const rows = await loadCompanies(req);
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, rows));
    },

    getByCompany: async (req, res) => {
        const company = await Company.findByPk(req.params.companyId, {
            include: companyInclude,
        });

        if (!company) {
            return errorHandler(res, 'notFound', 'companyNotFound');
        }

        const metricsMap = await getBulkCompanyMetrics([company.id]);
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                returnObject.companySubscriber(company, metricsMap[company.id], dashboardLang(req))
            )
        );
    },

    companyDetail: async (req, res) => {
        const detail = await getCompanyDetail(req.params.companyId, dashboardLang(req));
        if (!detail) {
            return errorHandler(res, 'notFound', 'companyNotFound');
        }
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, detail));
    },

    activateCompany: async (req, res) => {
        const { companyId } = req.params;
        const { subscriptionPlanId, notes, paymentId } = req.body;

        if (!subscriptionPlanId) {
            return errorHandler(res, 'fail', 'planRequired');
        }

        try {
            const sub = await activateCompanySubscription({
                companyId,
                subscriptionPlanId,
                adminId: req.admin?.id,
                notes: notes || '',
                paymentId: paymentId || null,
            });

            await logAudit(req, {
                action: 'subscription.activated',
                module: 'subscribers',
                metadata: { companyId, subscriptionPlanId, platform: sub.platform, paymentId },
            });

            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('subscriptionActivated'),
                    200,
                    {
                        id: sub.id,
                        companyId: sub.companyId,
                        platform: sub.platform,
                        status: sub.status,
                        startsAt: sub.startsAt,
                        expiresAt: sub.expiresAt,
                    }
                )
            );
        } catch (e) {
            if (e.message === 'companyNotFound') return errorHandler(res, 'notFound', 'companyNotFound');
            if (e.message === 'invalidPlan') return errorHandler(res, 'fail', 'invalidPlan');
            throw e;
        }
    },

    suspendCompany: async (req, res) => {
        const { companyId } = req.params;
        const { platform } = req.body;

        if (!platform || !['desktop', 'mobile'].includes(platform)) {
            return errorHandler(res, 'fail', 'invalidPlatform');
        }

        try {
            const sub = await suspendCompanySubscription(companyId, platform);
            await logAudit(req, {
                action: 'subscription.suspended',
                module: 'subscribers',
                metadata: { companyId, platform },
            });
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('subscriptionSuspended'),
                    200,
                    {
                        id: sub.id,
                        companyId: sub.companyId,
                        platform: sub.platform,
                        status: sub.status,
                    }
                )
            );
        } catch (e) {
            if (e.message === 'subscriptionNotFound') {
                return errorHandler(res, 'notFound', 'subscriptionNotFound');
            }
            throw e;
        }
    },

    companySubscriptions: async (req, res) => {
        const subs = await CompanySubscription.findAll({
            where: { companyId: { [Op.ne]: null } },
            include: [
                { model: Company, as: 'company' },
                { model: SubscriptionPlan, as: 'subscriptionPlan' },
            ],
            order: [['id', 'DESC']],
            limit: Math.min(Number(req.query.limit) || 200, 500),
        });

        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                subs.map((s) => ({
                    id: s.id,
                    companyId: s.companyId,
                    companyName: s.company?.name || null,
                    subscriptionPlanId: s.subscriptionPlanId,
                    platform: s.platform,
                    status: s.status,
                    startsAt: s.startsAt,
                    expiresAt: s.expiresAt,
                    plan: s.subscriptionPlan
                        ? {
                              id: s.subscriptionPlan.id,
                              name: s.subscriptionPlan.getLocalizedName?.('ar') || s.subscriptionPlan.name?.ar,
                              price: s.subscriptionPlan.price,
                          }
                        : null,
                }))
            )
        );
    },
};
