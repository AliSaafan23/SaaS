import { Op } from 'sequelize';
import { Branch } from '../../models/index.js';

export const getActiveBranchIds = async (companyId) => {
    const rows = await Branch.findAll({
        where: { companyId, status: { [Op.ne]: 'inactive' } },
        attributes: ['id'],
        raw: true,
    });
    return rows.map((r) => Number(r.id)).filter(Boolean);
};

export const resolveBranchFilter = async (companyId, branchIdRaw) => {
    if (branchIdRaw == null || branchIdRaw === '' || branchIdRaw === 'all') return null;
    const branchId = Number(branchIdRaw);
    if (!Number.isFinite(branchId)) return null;

    const branch = await Branch.findOne({
        where: { id: branchId, companyId, status: { [Op.ne]: 'inactive' } },
        attributes: ['id'],
    });
    if (!branch) {
        const err = new Error('branchNotFound');
        err.code = 'BRANCH_FORBIDDEN';
        throw err;
    }
    return branchId;
};

export const branchIdWhere = (branchIds, branchId) => {
    if (branchId) return branchId;
    if (!branchIds.length) return -1;
    return { [Op.in]: branchIds };
};

export default { getActiveBranchIds, resolveBranchFilter, branchIdWhere };
