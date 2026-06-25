import { Op } from 'sequelize';
import { Unit } from '../../../models/index.js';
import {
    requireCatalogTenant,
    scopedCatalogWhere,
    CatalogScopeError,
} from './catalogScope.js';

export const listUnits = async (req, { search } = {}) => {
    const where = await scopedCatalogWhere(req, {});
    if (search?.trim()) {
        where.name = { [Op.like]: `%${search.trim()}%` };
    }
    return Unit.findAll({
        where,
        order: [['name', 'ASC']],
    });
};

export const createUnit = async (req, { name }) => {
    const { companyId, branchId } = await requireCatalogTenant(req);
    const trimmed = name.trim();

    const existing = await Unit.findOne({
        where: { companyId, branchId, name: trimmed },
    });
    if (existing) {
        throw new CatalogScopeError('unitAlreadyExists');
    }

    return Unit.create({ name: trimmed, companyId, branchId });
};

export default { listUnits, createUnit };
