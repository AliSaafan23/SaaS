import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { Customer } from '../../models/index.js';

const tenantWhere = (req, extra = {}) => ({ tenantId: req.tenantId, ...extra });

export default {
    list: async (req, res) => {
        const customers = await Customer.findAll({ where: tenantWhere(req), order: [['name', 'ASC']] });
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                customers.map((c) => returnObject.customer(c))
            )
        );
    },

    getById: async (req, res) => {
        const customer = await Customer.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!customer) return errorHandler(res, 'notFound', 'customerNotFound');
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, returnObject.customer(customer)));
    },

    create: async (req, res) => {
        const { name, email, phone, status } = req.body;
        if (!name) return errorHandler(res, 'fail', 'validationFailed');

        const customer = await Customer.create({
            tenantId: req.tenantId,
            name,
            email,
            phone,
            status: status || 'active',
        });

        res.send(new ApiResponse('success', i18n.__('customerCreated'), 201, returnObject.customer(customer)));
    },

    update: async (req, res) => {
        const customer = await Customer.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!customer) return errorHandler(res, 'notFound', 'customerNotFound');

        const { name, email, phone, status } = req.body;
        await customer.update({
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(phone !== undefined && { phone }),
            ...(status !== undefined && { status }),
        });

        res.send(new ApiResponse('success', i18n.__('customerUpdated'), 200, returnObject.customer(customer)));
    },

    remove: async (req, res) => {
        const customer = await Customer.findOne({ where: tenantWhere(req, { id: req.params.id }) });
        if (!customer) return errorHandler(res, 'notFound', 'customerNotFound');
        await customer.destroy();
        res.send(new ApiResponse('success', i18n.__('customerDeleted'), 200, {}));
    },
};
