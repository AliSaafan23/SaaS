import { PaymentMethod } from '../../models/index.js';

export const listActivePaymentMethods = async () =>
    PaymentMethod.findAll({
        where: { isActive: true },
        order: [
            ['sortOrder', 'ASC'],
            ['id', 'ASC'],
        ],
    });

export const listAllPaymentMethods = async () =>
    PaymentMethod.findAll({
        order: [
            ['sortOrder', 'ASC'],
            ['id', 'ASC'],
        ],
    });

export const findPaymentMethodById = async (id) => PaymentMethod.findByPk(id);

const normalizeCode = (code) =>
    String(code || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

export const sanitizePaymentMethodPayload = (data, { partial = false } = {}) => {
    const out = {};

    if (!partial || data.code !== undefined) {
        const code = normalizeCode(data.code);
        if (!code) throw new Error('paymentMethodCodeRequired');
        out.code = code;
    }

    if (!partial || data.nameAr !== undefined) {
        const nameAr = String(data.nameAr || '').trim();
        if (!nameAr) throw new Error('paymentMethodNameRequired');
        out.nameAr = nameAr;
    }

    if (!partial || data.nameEn !== undefined) {
        const nameEn = String(data.nameEn || '').trim();
        if (!nameEn) throw new Error('paymentMethodNameRequired');
        out.nameEn = nameEn;
    }

    if (!partial || data.affectsCashbox !== undefined) {
        out.affectsCashbox = Boolean(
            data.affectsCashbox === true || data.affectsCashbox === 'true' || data.affectsCashbox === 1
        );
    }

    if (!partial || data.requiresCustomer !== undefined) {
        out.requiresCustomer = Boolean(
            data.requiresCustomer === true ||
                data.requiresCustomer === 'true' ||
                data.requiresCustomer === 1
        );
    }

    if (!partial || data.isActive !== undefined) {
        out.isActive = !(
            data.isActive === false ||
            data.isActive === 'false' ||
            data.isActive === 0 ||
            data.isActive === '0'
        );
    }

    if (!partial || data.sortOrder !== undefined) {
        out.sortOrder = Number(data.sortOrder) || 0;
    }

    return out;
};

export default {
    listActivePaymentMethods,
    listAllPaymentMethods,
    findPaymentMethodById,
    sanitizePaymentMethodPayload,
};
