import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { Op } from 'sequelize';
import persianJs from 'persianjs';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import {
    Branch,
    Cashier,
    CompanySubscription,
    SubscriptionPlan,
} from '../../models/index.js';
import { issueActivationCode } from '../../helpers/api/cashierAuth.js';
import { lang } from './shared.js';

const normalizeCashierPhone = (phone) => {
    if (!phone || !String(phone).trim()) return '';
    return persianJs(String(phone).trim()).toEnglishNumber().toString();
};

const findCashierByEmail = (email, excludeId = null) => {
    const where = {
        email: email.trim().toLowerCase(),
        status: { [Op.ne]: 'delete' },
    };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return Cashier.findOne({ where });
};

const findCashierByPhone = (phone, excludeId = null) => {
    const normalized = normalizeCashierPhone(phone);
    if (!normalized) return Promise.resolve(null);

    const where = {
        phone: normalized,
        status: { [Op.ne]: 'delete' },
    };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return Cashier.findOne({ where });
};
const listCashiers = async (req, res) => {
    const merchant = req.merchant;

    const cashiers = await Cashier.findAll({
        include: [
            {
                model: Branch,
                as: 'branch',
                where: { companyId: merchant.companyId },
                required: true,
                attributes: ['id', 'name'],
            },
        ],
        where: { status: { [Op.ne]: 'delete' } },
        order: [['id', 'ASC']],
    });

    const data = cashiers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        status: c.status,
        active: c.active,
        branch: c.branch
            ? { id: c.branch.id, name: c.branch.name }
            : null,
        createdAt: c.createdAt,
    }));

    res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
};

const createCashier = async (req, res) => {
    const merchant = req.merchant;
    const { branchId, name, email, phone, password } = matchedData(req);

    const branch = await Branch.findOne({
        where: { id: branchId, companyId: merchant.companyId, status: 'active' },
    });
    if (!branch) {
        return errorHandler(res, 'notFound', 'branchNotFound');
    }

    const activeSub = await CompanySubscription.findOne({
        where: { companyId: merchant.companyId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });

    if (!activeSub) {
        return errorHandler(res, 'fail', 'subscriptionRequired');
    }

    const maxDevices = activeSub.subscriptionPlan?.maxDevices || 1;
    const currentCashiers = await Cashier.count({
        include: [{
            model: Branch,
            as: 'branch',
            where: { companyId: merchant.companyId },
            required: true,
        }],
        where: { status: { [Op.ne]: 'delete' } },
    });

    if (currentCashiers >= maxDevices) {
        return errorHandler(res, 'fail', 'cashierLimitReached');
    }

    const existsEmail = await findCashierByEmail(email);
    if (existsEmail) {
        return errorHandler(res, 'fail', 'emailAlreadyExists');
    }

    const normalizedPhone = normalizeCashierPhone(phone);
    const existsPhone = await findCashierByPhone(normalizedPhone);
    if (existsPhone) {
        return errorHandler(res, 'fail', 'phoneAlreadyExists');
    }

    const cashier = await Cashier.create({
        branchId,
        name,
        email,
        phone: normalizedPhone,
        password,
        status: 'active',
        active: false,
        language: lang(req),
    });

    try {
        await issueActivationCode(cashier, lang(req));
    } catch (err) {
        console.error('cashier activation email error:', err);
    }

    res.send(
        new ApiResponse('success', i18n.__('cashierCreatedPendingActivation'), 201, {
            id: cashier.id,
            name: cashier.name,
            email: cashier.email,
            phone: cashier.phone,
            branchId: cashier.branchId,
            status: cashier.status,
            active: cashier.active,
        })
    );
};

const updateCashier = async (req, res) => {
    const merchant = req.merchant;
    const cashierId = req.params.id;

    const cashier = await Cashier.findOne({
        where: { id: cashierId, status: { [Op.ne]: 'delete' } },
        include: [{
            model: Branch,
            as: 'branch',
            where: { companyId: merchant.companyId },
            required: true,
        }],
    });

    if (!cashier) {
        return errorHandler(res, 'notFound', 'cashierNotFound');
    }

    const { name, phone, branchId, status } = matchedData(req);

    if (branchId && branchId !== cashier.branchId) {
        const newBranch = await Branch.findOne({
            where: { id: branchId, companyId: merchant.companyId, status: 'active' },
        });
        if (!newBranch) {
            return errorHandler(res, 'notFound', 'branchNotFound');
        }
    }

    if (phone !== undefined) {
        const normalizedPhone = normalizeCashierPhone(phone);
        const existsPhone = await findCashierByPhone(normalizedPhone, cashier.id);
        if (existsPhone) {
            return errorHandler(res, 'fail', 'phoneAlreadyExists');
        }
    }

    await cashier.update({
        ...(name && { name }),
        ...(phone !== undefined && { phone: normalizeCashierPhone(phone) }),
        ...(branchId && { branchId }),
        ...(status && ['active', 'block'].includes(status) && { status }),
    });

    res.send(
        new ApiResponse('success', i18n.__('cashierUpdated'), 200, {
            id: cashier.id,
            name: cashier.name,
            email: cashier.email,
            phone: cashier.phone,
            branchId: cashier.branchId,
            status: cashier.status,
        })
    );
};

const deleteCashier = async (req, res) => {
    const merchant = req.merchant;
    const cashierId = req.params.id;

    const cashier = await Cashier.findOne({
        where: { id: cashierId, status: { [Op.ne]: 'delete' } },
        include: [{
            model: Branch,
            as: 'branch',
            where: { companyId: merchant.companyId },
            required: true,
        }],
    });

    if (!cashier) {
        return errorHandler(res, 'notFound', 'cashierNotFound');
    }

    await cashier.update({ status: 'delete' });

    res.send(new ApiResponse('success', i18n.__('cashierDeleted'), 200, {}));
};

export default {
    listCashiers,
    createCashier,
    updateCashier,
    deleteCashier,
};
