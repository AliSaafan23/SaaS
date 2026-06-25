import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { Op, fn, col } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import {
    Branch,
    Cashier,
    CompanySubscription,
    SubscriptionPlan,
} from '../../models/index.js';

const listBranches = async (req, res) => {
    const merchant = req.merchant;

    const branches = await Branch.findAll({
        where: { companyId: merchant.companyId, status: { [Op.ne]: 'inactive' } },
        attributes: ['id', 'name', 'address', 'phone', 'status', 'createdAt'],
        order: [['name', 'ASC']],
    });

    const cashierCounts = await Cashier.findAll({
        attributes: ['branchId', [fn('COUNT', col('Cashier.id')), 'count']],
        where: { status: { [Op.ne]: 'delete' } },
        include: [
            {
                model: Branch,
                as: 'branch',
                attributes: [],
                where: { companyId: merchant.companyId, status: { [Op.ne]: 'inactive' } },
                required: true,
            },
        ],
        group: ['branchId'],
        raw: true,
    });
    const cashierMap = new Map(cashierCounts.map((r) => [Number(r.branchId), Number(r.count) || 0]));

    const data = branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        status: b.status,
        cashierCount: cashierMap.get(b.id) || 0,
        createdAt: b.createdAt,
    }));

    res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
};

const createBranch = async (req, res) => {
    const merchant = req.merchant;
    const { name, address, phone } = matchedData(req);

    const activeSub = await CompanySubscription.findOne({
        where: { companyId: merchant.companyId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });

    if (!activeSub) {
        return errorHandler(res, 'fail', 'subscriptionRequired');
    }

    const maxBranches = activeSub.subscriptionPlan?.maxBranches || 1;
    const currentBranches = await Branch.count({
        where: { companyId: merchant.companyId, status: 'active' },
    });

    if (currentBranches >= maxBranches) {
        return errorHandler(res, 'fail', 'branchLimitReached');
    }

    const branch = await Branch.create({
        companyId: merchant.companyId,
        name,
        address: address || '',
        phone: phone || '',
        status: 'active',
    });

    res.send(
        new ApiResponse('success', i18n.__('branchCreated'), 201, {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            status: branch.status,
        })
    );
};

const updateBranch = async (req, res) => {
    const merchant = req.merchant;
    const branchId = req.params.id;

    const branch = await Branch.findOne({
        where: { id: branchId, companyId: merchant.companyId },
    });

    if (!branch) {
        return errorHandler(res, 'notFound', 'branchNotFound');
    }

    const { name, address, phone } = req.body;
    await branch.update({
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
    });

    res.send(
        new ApiResponse('success', i18n.__('branchUpdated'), 200, {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            status: branch.status,
        })
    );
};

const deleteBranch = async (req, res) => {
    const merchant = req.merchant;
    const branchId = req.params.id;

    const branch = await Branch.findOne({
        where: { id: branchId, companyId: merchant.companyId },
    });

    if (!branch) {
        return errorHandler(res, 'notFound', 'branchNotFound');
    }

    await Cashier.update({ branchId: null }, { where: { branchId: branch.id } });
    await branch.update({ status: 'inactive' });

    res.send(new ApiResponse('success', i18n.__('branchDeleted'), 200, {}));
};

export default {
    listBranches,
    createBranch,
    updateBranch,
    deleteBranch,
};
