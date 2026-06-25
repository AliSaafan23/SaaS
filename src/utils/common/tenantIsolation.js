import { Branch } from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * Resolves the tenant context (companyId and branchId) from the request.
 * Supports both Merchant and Cashier sessions.
 */
export const resolveTenantContext = async (req) => {
    if (req.companyId !== undefined && req.companyId !== null) {
        return { companyId: req.companyId, branchId: req.branchId ?? null };
    }

    let companyId = null;
    let branchId = null;

    if (req.merchant) {
        companyId = req.merchant.companyId;
        const requestedBranchId =
            req.headers['x-branch-id'] || req.query.branchId || req.body?.branchId;
        if (requestedBranchId) {
            const branch = await Branch.findOne({
                where: { id: requestedBranchId, companyId },
            });
            if (branch) {
                branchId = branch.id;
            }
        }
    } else if (req.cashier) {
        branchId = req.cashier.branchId;

        if (branchId) {
            const branch = await Branch.findByPk(branchId);
            if (branch) {
                companyId = branch.companyId;
            }
        }
    }

    req.companyId = companyId;
    req.branchId = branchId;

    return { companyId, branchId };
};

/**
 * Helper to build where clause for company-level (master data) models.
 * @deprecated Prefer scopeCatalog for branch-isolated catalog tables.
 */
export const scopeCompany = async (req, where = {}) => {
    const { companyId } = await resolveTenantContext(req);
    if (!companyId) return where;
    return { ...where, companyId };
};

/**
 * Helper to build where clause for branch-level (operational data) models.
 * (Sales, Purchases, CashboxTransactions, Expenses, StockMovements)
 */
export const scopeBranch = async (req, where = {}) => {
    const { companyId, branchId } = await resolveTenantContext(req);

    if (branchId) {
        return { ...where, branchId };
    }

    if (companyId) {
        const branches = await Branch.findAll({
            where: { companyId, status: 'active' },
            attributes: ['id'],
        });
        const branchIds = branches.map((b) => b.id);
        return {
            ...where,
            branchId: { [Op.in]: branchIds },
        };
    }

    return where;
};

/**
 * Catalog isolation: Products, Categories, Brands, Units, Customers, Suppliers.
 * Cashier → fixed branchId. Merchant → optional branch filter or all company branches.
 */
export const scopeCatalog = async (req, where = {}) => {
    const { companyId, branchId } = await resolveTenantContext(req);

    if (!companyId) return where;

    const scoped = { ...where, companyId };

    if (branchId) {
        return { ...scoped, branchId };
    }

    if (req.merchant) {
        const branches = await Branch.findAll({
            where: { companyId, status: 'active' },
            attributes: ['id'],
        });
        const branchIds = branches.map((b) => b.id);
        if (branchIds.length) {
            return { ...scoped, branchId: { [Op.in]: branchIds } };
        }
    }

    return scoped;
};

export default {
    resolveTenantContext,
    scopeCompany,
    scopeBranch,
    scopeCatalog,
};
