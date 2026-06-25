import { Op } from 'sequelize';
import { Category, Product } from '../../../models/index.js';
import {
    requireCatalogTenant,
    scopedCatalogWhere,
    findScopedCategory,
    CatalogScopeError,
} from './catalogScope.js';

export const listCategories = async (req, { search } = {}) => {
    const where = await scopedCatalogWhere(req, {});
    if (search?.trim()) {
        where.name = { [Op.like]: `%${search.trim()}%` };
    }
    return Category.findAll({
        where,
        order: [['name', 'ASC']],
    });
};

export const createCategory = async (req, { name }) => {
    const { companyId, branchId } = await requireCatalogTenant(req);
    const trimmed = name.trim();

    const existing = await Category.findOne({
        where: { companyId, branchId, name: trimmed },
    });
    if (existing) {
        throw new CatalogScopeError('categoryAlreadyExists');
    }

    return Category.create({ name: trimmed, companyId, branchId });
};

export const deleteCategory = async (req, categoryId) => {
    const category = await findScopedCategory(req, categoryId);
    if (!category) {
        throw new CatalogScopeError('categoryNotFound');
    }

    const productsCount = await Product.count({
        where: { category_id: categoryId, status: 'active' },
    });
    if (productsCount > 0) {
        throw new CatalogScopeError('categoryHasProducts');
    }

    await category.destroy();
    return true;
};

export default { listCategories, createCategory, deleteCategory };
