import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { errorHandler } from '../../helpers/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import {
    getFeatureCatalogPayload,
    normalizePlanPlatform,
    sanitizePlanPayload,
} from '../../helpers/dashboard/subscriptionPlanFeatures.js';
import { SubscriptionPlan, CompanySubscription, SubscriptionPayment } from '../../models/index.js';

const planError = (res, key) => errorHandler(res, 'fail', key);

export default {
    featuresCatalog: async (req, res) => {
        const data = await getFeatureCatalogPayload();
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    list: async (req, res) => {
        const where = { isActive: true };
        const platform = normalizePlanPlatform(req.query.platform);
        if (platform) where.platform = platform;
        if (req.query.all === '1') delete where.isActive;

        const plans = await SubscriptionPlan.findAll({ where, order: [['platform', 'ASC'], ['price', 'ASC']] });
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                plans.map((p) => returnObject.subscriptionPlan(p))
            )
        );
    },

    getById: async (req, res) => {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return errorHandler(res, 'notFound', 'planNotFound');
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, returnObject.subscriptionPlan(plan)));
    },

    create: async (req, res) => {
        let data;
        try {
            data = await sanitizePlanPayload(req.body);
        } catch (e) {
            return planError(res, e.message || 'validationError');
        }

        if (data.durationDays === undefined) {
            const cycle = data.billingCycle || 'monthly';
            data.durationDays = cycle === 'annual' ? 365 : cycle === 'lifetime' ? 36500 : 30;
        }

        const plan = await SubscriptionPlan.create(data);

        await logAudit(req, { action: 'plan.created', module: 'subscriptions', metadata: { planId: plan.id } });
        res.send(new ApiResponse('success', i18n.__('planCreated'), 201, returnObject.subscriptionPlan(plan)));
    },

    update: async (req, res) => {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return errorHandler(res, 'notFound', 'planNotFound');

        let updates;
        try {
            updates = await sanitizePlanPayload(req.body, { partial: true });
        } catch (e) {
            return planError(res, e.message || 'validationError');
        }

        if (!Object.keys(updates).length) {
            return planError(res, 'validationError');
        }

        await plan.update(updates);
        await logAudit(req, { action: 'plan.updated', module: 'subscriptions', metadata: { planId: plan.id } });
        res.send(new ApiResponse('success', i18n.__('planUpdated'), 200, returnObject.subscriptionPlan(plan)));
    },

    remove: async (req, res) => {
        const plan = await SubscriptionPlan.findByPk(req.params.id);
        if (!plan) return errorHandler(res, 'notFound', 'planNotFound');

        const [subsCount, paymentsCount] = await Promise.all([
            CompanySubscription.count({ where: { subscriptionPlanId: plan.id } }),
            SubscriptionPayment.count({ where: { subscriptionPlanId: plan.id, status: 'pending' } }),
        ]);

        if (subsCount > 0 || paymentsCount > 0) {
            return errorHandler(res, 'fail', 'planInUse');
        }

        await plan.destroy();
        await logAudit(req, { action: 'plan.deleted', module: 'subscriptions', metadata: { planId: plan.id } });
        res.send(new ApiResponse('success', i18n.__('planDeleted'), 200, {}));
    },
};
