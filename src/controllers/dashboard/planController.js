import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { Plan } from '../../models/index.js';

const tenantWhere = (req, extra = {}) => ({ tenantId: req.tenantId, ...extra });

export default {
    list: async (req, res) => {
        const plans = await Plan.findAll({
            where: tenantWhere(req),
            order: [['price', 'ASC']],
        });
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                plans.map((p) => returnObject.plan(p))
            )
        );
    },

    getById: async (req, res) => {
        const plan = await Plan.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!plan) return errorHandler(res, 'notFound', 'planNotFound');
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, returnObject.plan(plan)));
    },

    create: async (req, res) => {
        const { name, description, price, billingCycle, currency, isActive } = req.body;
        if (!name || price === undefined) return errorHandler(res, 'fail', 'validationFailed');

        const plan = await Plan.create({
            tenantId: req.tenantId,
            name,
            description,
            price,
            billingCycle: billingCycle || 'monthly',
            currency: currency || 'USD',
            isActive: isActive !== false,
        });

        res.send(new ApiResponse('success', i18n.__('planCreated'), 201, returnObject.plan(plan)));
    },

    update: async (req, res) => {
        const plan = await Plan.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!plan) return errorHandler(res, 'notFound', 'planNotFound');

        const { name, description, price, billingCycle, currency, isActive } = req.body;
        await plan.update({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(price !== undefined && { price }),
            ...(billingCycle !== undefined && { billingCycle }),
            ...(currency !== undefined && { currency }),
            ...(isActive !== undefined && { isActive }),
        });

        res.send(new ApiResponse('success', i18n.__('planUpdated'), 200, returnObject.plan(plan)));
    },

    remove: async (req, res) => {
        const plan = await Plan.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!plan) return errorHandler(res, 'notFound', 'planNotFound');
        await plan.destroy();
        res.send(new ApiResponse('success', i18n.__('planDeleted'), 200, {}));
    },
};
