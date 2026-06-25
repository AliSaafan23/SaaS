import i18n from 'i18n';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { errorHandler } from '../../helpers/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import {
    listAllPaymentMethods,
    sanitizePaymentMethodPayload,
} from '../../helpers/dashboard/paymentMethodService.js';
import { PaymentMethod, Sale } from '../../models/index.js';

const dashboardLang = (req) => (req.headers.lang === 'en' ? 'en' : 'ar');

const pmError = (res, key) => errorHandler(res, 'fail', key);

export default {
    list: async (req, res) => {
        const methods = await listAllPaymentMethods();
        const lang = dashboardLang(req);
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                methods.map((m) => returnObject.paymentMethod(m, lang))
            )
        );
    },

    getById: async (req, res) => {
        const method = await PaymentMethod.findByPk(req.params.id);
        if (!method) return errorHandler(res, 'notFound', 'paymentMethodNotFound');
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                returnObject.paymentMethod(method, dashboardLang(req))
            )
        );
    },

    create: async (req, res) => {
        let data;
        try {
            data = sanitizePaymentMethodPayload(req.body);
        } catch (e) {
            return pmError(res, e.message || 'validationError');
        }

        const exists = await PaymentMethod.findOne({ where: { code: data.code } });
        if (exists) return pmError(res, 'paymentMethodCodeExists');

        const method = await PaymentMethod.create(data);

        await logAudit(req, {
            action: 'paymentMethod.created',
            module: 'paymentMethods',
            metadata: { paymentMethodId: method.id },
        });

        res.send(
            new ApiResponse(
                'success',
                i18n.__('paymentMethodCreated'),
                201,
                returnObject.paymentMethod(method, dashboardLang(req))
            )
        );
    },

    update: async (req, res) => {
        const method = await PaymentMethod.findByPk(req.params.id);
        if (!method) return errorHandler(res, 'notFound', 'paymentMethodNotFound');

        let updates;
        try {
            updates = sanitizePaymentMethodPayload(req.body, { partial: true });
        } catch (e) {
            return pmError(res, e.message || 'validationError');
        }

        if (!Object.keys(updates).length) {
            return pmError(res, 'validationError');
        }

        if (updates.code && updates.code !== method.code) {
            const exists = await PaymentMethod.findOne({
                where: { code: updates.code, id: { [Op.ne]: method.id } },
            });
            if (exists) return pmError(res, 'paymentMethodCodeExists');
        }

        await method.update(updates);

        await logAudit(req, {
            action: 'paymentMethod.updated',
            module: 'paymentMethods',
            metadata: { paymentMethodId: method.id },
        });

        res.send(
            new ApiResponse(
                'success',
                i18n.__('paymentMethodUpdated'),
                200,
                returnObject.paymentMethod(method, dashboardLang(req))
            )
        );
    },

    remove: async (req, res) => {
        const method = await PaymentMethod.findByPk(req.params.id);
        if (!method) return errorHandler(res, 'notFound', 'paymentMethodNotFound');

        const salesCount = await Sale.count({ where: { payment_method_id: method.id } });
        if (salesCount > 0) {
            return errorHandler(res, 'fail', 'paymentMethodInUse');
        }

        await method.destroy();

        await logAudit(req, {
            action: 'paymentMethod.deleted',
            module: 'paymentMethods',
            metadata: { paymentMethodId: method.id },
        });

        res.send(new ApiResponse('success', i18n.__('paymentMethodDeleted'), 200, {}));
    },
};
