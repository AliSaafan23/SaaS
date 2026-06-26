import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { Subscription, Customer, Plan } from '../../models/index.js';

const tenantWhere = (req, extra = {}) => ({ tenantId: req.tenantId, ...extra });

export default {
    list: async (req, res) => {
        const rows = await Subscription.findAll({
            where: tenantWhere(req),
            include: [
                { model: Customer, as: 'customer' },
                { model: Plan, as: 'plan' },
            ],
            order: [['id', 'DESC']],
        });
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                rows.map((s) => returnObject.subscription(s))
            )
        );
    },

    getById: async (req, res) => {
        const row = await Subscription.findOne({
            where: tenantWhere(req, { id: req.params.id }),
            include: [
                { model: Customer, as: 'customer' },
                { model: Plan, as: 'plan' },
            ],
        });
        if (!row) return errorHandler(res, 'notFound', 'subscriptionNotFound');
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, returnObject.subscription(row)));
    },

    create: async (req, res) => {
        const { customerId, planId, startDate, status } = req.body;
        if (!customerId || !planId || !startDate) return errorHandler(res, 'fail', 'validationFailed');

        const customer = await Customer.findOne({ where: tenantWhere(req, { id: customerId }) });
        const plan = await Plan.findOne({ where: tenantWhere(req, { id: planId }) });
        if (!customer || !plan) return errorHandler(res, 'notFound', 'validationFailed');

        const subscription = await Subscription.create({
            tenantId: req.tenantId,
            customerId,
            planId,
            startDate,
            status: status || 'active',
            nextBillingDate: startDate,
        });

        const full = await Subscription.findByPk(subscription.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: Plan, as: 'plan' },
            ],
        });

        res.send(
            new ApiResponse('success', i18n.__('subscriptionCreated'), 201, returnObject.subscription(full))
        );
    },

    update: async (req, res) => {
        const subscription = await Subscription.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!subscription) return errorHandler(res, 'notFound', 'subscriptionNotFound');

        const { status, nextBillingDate } = req.body;
        await subscription.update({
            ...(status !== undefined && { status }),
            ...(nextBillingDate !== undefined && { nextBillingDate }),
        });

        const full = await Subscription.findByPk(subscription.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: Plan, as: 'plan' },
            ],
        });

        res.send(new ApiResponse('success', i18n.__('subscriptionUpdated'), 200, returnObject.subscription(full)));
    },

    remove: async (req, res) => {
        const subscription = await Subscription.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!subscription) return errorHandler(res, 'notFound', 'subscriptionNotFound');
        await subscription.update({ status: 'cancelled' });
        res.send(new ApiResponse('success', i18n.__('subscriptionCancelled'), 200, {}));
    },
};
