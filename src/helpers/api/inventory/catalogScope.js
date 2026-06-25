import { resolveTenantContext, scopeCatalog } from '../../../utils/common/tenantIsolation.js';
import { Category, Unit } from '../../../models/index.js';

export class CatalogScopeError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

export const requireCatalogTenant = async (req) => {
    const { companyId, branchId } = await resolveTenantContext(req);
    if (!companyId || !branchId) {
        throw new CatalogScopeError('branchNotFound');
    }
    return { companyId, branchId };
};

export const scopedCatalogWhere = (req, where = {}) => scopeCatalog(req, where);

export const findScopedCategory = async (req, categoryId) => {
    if (!categoryId) return null;
    const where = await scopeCatalog(req, { id: categoryId });
    return Category.findOne({ where });
};

export const findScopedUnit = async (req, unitId) => {
    if (!unitId) return null;
    const where = await scopeCatalog(req, { id: unitId });
    return Unit.findOne({ where });
};

export const findScopedCategoryByName = async (req, name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const where = await scopeCatalog(req, { name: trimmed });
    return Category.findOne({ where });
};

export const findScopedUnitByName = async (req, name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const where = await scopeCatalog(req, { name: trimmed });
    return Unit.findOne({ where });
};

export const resolveScopedCategoryId = async (req, value) => {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value).trim();
    if (!text) return null;

    if (/^\d+$/.test(text)) {
        const category = await findScopedCategory(req, Number(text));
        if (!category) throw new CatalogScopeError('categoryNotFound');
        return category.id;
    }

    const category = await findScopedCategoryByName(req, text);
    if (!category) throw new CatalogScopeError('categoryNotFound');
    return category.id;
};

export const resolveScopedUnitId = async (req, value) => {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value).trim();
    if (!text) return null;

    if (/^\d+$/.test(text)) {
        const unit = await findScopedUnit(req, Number(text));
        if (!unit) throw new CatalogScopeError('unitNotFound');
        return unit.id;
    }

    const unit = await findScopedUnitByName(req, text);
    if (!unit) throw new CatalogScopeError('unitNotFound');
    return unit.id;
};

export default {
    CatalogScopeError,
    requireCatalogTenant,
    scopedCatalogWhere,
    findScopedCategory,
    findScopedUnit,
    findScopedCategoryByName,
    findScopedUnitByName,
    resolveScopedCategoryId,
    resolveScopedUnitId,
};
