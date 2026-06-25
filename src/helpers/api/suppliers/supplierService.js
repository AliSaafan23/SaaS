import { Op, fn, col, where as seqWhere } from 'sequelize';
import { Supplier, Purchase } from '../../../models/index.js';
import {
    requireCatalogTenant,
    scopedCatalogWhere,
    CatalogScopeError,
} from '../inventory/catalogScope.js';
import {
    parseDecimal,
    mergeOpeningBalance,
    computeSupplierPayables,
} from './supplierBalance.js';

export { CatalogScopeError };

const caseInsensitiveLike = (column, term) =>
    seqWhere(fn('LOWER', col(column)), {
        [Op.like]: `%${String(term).trim().toLowerCase()}%`,
    });

const searchWhere = (search) => {
    if (!search?.trim()) return {};
    const term = `%${search.trim()}%`;
    return {
        [Op.or]: [
            { name: { [Op.like]: term } },
            { phone: { [Op.like]: term } },
            { supplier_code: { [Op.like]: term } },
        ],
    };
};

const supplierTextSearchWhere = (search) => {
    if (!search?.trim()) return {};
    const term = search.trim();
    return {
        [Op.or]: [
            caseInsensitiveLike('name', term),
            caseInsensitiveLike('phone', term),
            caseInsensitiveLike('supplier_code', term),
        ],
    };
};

const generateSupplierCode = async (companyId, branchId) => {
    const last = await Supplier.findOne({
        where: { companyId, branchId },
        order: [['id', 'DESC']],
        attributes: ['supplier_code'],
    });

    const numeric = Number.parseInt(String(last?.supplier_code || '0'), 10);
    const next = Number.isFinite(numeric) && numeric > 0 ? numeric + 1 : 1;
    return String(next);
};

export const findSupplierInScope = async (req, supplierId) => {
    const where = await scopedCatalogWhere(req, { id: supplierId });
    return Supplier.findOne({ where });
};

export const searchSuppliers = async (req, term, { limit = 50 } = {}) => {
    const q = String(term || '').trim();
    if (!q) return [];

    const baseWhere = await scopedCatalogWhere(req, supplierTextSearchWhere(q));
    const pageLimit = Math.min(50, Math.max(1, Number(limit) || 50));

    return Supplier.findAll({
        where: baseWhere,
        order: [
            ['name', 'ASC'],
            ['supplier_code', 'ASC'],
        ],
        limit: pageLimit,
    });
};

const normalizeSupplierPayload = (data) => {
    const payload = { ...data };

    if (payload.name) payload.name = String(payload.name).trim();
    if (payload.phone !== undefined) {
        payload.phone = payload.phone ? String(payload.phone).trim() : null;
    }
    if (payload.address !== undefined) {
        payload.address = payload.address ? String(payload.address).trim() : null;
    }
    if (payload.tax_number !== undefined) {
        payload.tax_number = payload.tax_number ? String(payload.tax_number).trim() : null;
    }
    if (payload.material_number !== undefined) {
        payload.material_number = payload.material_number
            ? String(payload.material_number).trim()
            : null;
    }
    if (payload.commercial_register !== undefined) {
        payload.commercial_register = payload.commercial_register
            ? String(payload.commercial_register).trim()
            : null;
    }
    if (payload.statistical_number !== undefined) {
        payload.statistical_number = payload.statistical_number
            ? String(payload.statistical_number).trim()
            : null;
    }

    if (
        payload.opening_credit !== undefined ||
        payload.opening_debit !== undefined
    ) {
        const merged = mergeOpeningBalance({
            opening_credit: payload.opening_credit,
            opening_debit: payload.opening_debit,
        });
        if (merged.error) throw new CatalogScopeError(merged.error);
        payload.opening_balance = merged.opening_balance;
        delete payload.opening_credit;
        delete payload.opening_debit;
    } else if (payload.opening_balance !== undefined) {
        payload.opening_balance = parseDecimal(payload.opening_balance);
    }

    return payload;
};

export const listSuppliers = async (req, options = {}) => {
    const { search, page = 1, limit = 50 } = options;
    const where = await scopedCatalogWhere(req, searchWhere(search));

    const offset = (Math.max(1, Number(page)) - 1) * Math.min(200, Math.max(1, Number(limit)));
    const pageLimit = Math.min(200, Math.max(1, Number(limit)));

    const { rows, count } = await Supplier.findAndCountAll({
        where,
        order: [['name', 'ASC']],
        limit: pageLimit,
        offset,
    });

    return {
        items: rows,
        pagination: {
            page: Math.max(1, Number(page)),
            limit: pageLimit,
            total: count,
            pageCount: Math.ceil(count / pageLimit) || 1,
        },
    };
};

export const listOpeningBalances = async (req, { search } = {}) => {
    const where = await scopedCatalogWhere(req, supplierTextSearchWhere(search));
    return Supplier.findAll({
        where,
        order: [['supplier_code', 'ASC']],
        attributes: ['id', 'supplier_code', 'name', 'opening_balance'],
    });
};

export const updateOpeningBalance = async (req, supplierId, data) => {
    const supplier = await findSupplierInScope(req, supplierId);
    if (!supplier) throw new CatalogScopeError('supplierNotFound');

    const payload = normalizeSupplierPayload(data);
    if (payload.opening_balance === undefined) {
        throw new CatalogScopeError('openingBalanceRequired');
    }

    await supplier.update({ opening_balance: payload.opening_balance });
    return supplier.reload();
};

export const createSupplier = async (req, data) => {
    const { companyId, branchId } = await requireCatalogTenant(req);
    const payload = normalizeSupplierPayload(data);
    const supplier_code = await generateSupplierCode(companyId, branchId);

    return Supplier.create({
        supplier_code,
        name: payload.name,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        tax_number: payload.tax_number ?? null,
        material_number: payload.material_number ?? null,
        commercial_register: payload.commercial_register ?? null,
        statistical_number: payload.statistical_number ?? null,
        opening_balance: payload.opening_balance ?? 0,
        companyId,
        branchId,
    });
};

export const updateSupplier = async (req, supplierId, data) => {
    const supplier = await findSupplierInScope(req, supplierId);
    if (!supplier) throw new CatalogScopeError('supplierNotFound');

    const payload = normalizeSupplierPayload(data);
    if (payload.name !== undefined && !payload.name) {
        throw new CatalogScopeError('supplierNameRequired');
    }

    await supplier.update(payload);
    return supplier.reload();
};

export const deleteSupplier = async (req, supplierId) => {
    const supplier = await findSupplierInScope(req, supplierId);
    if (!supplier) throw new CatalogScopeError('supplierNotFound');

    const purchasesCount = await Purchase.count({ where: { supplier_id: supplierId } });
    if (purchasesCount > 0) throw new CatalogScopeError('supplierHasPurchases');

    await supplier.destroy();
    return true;
};

const buildPayablesForSuppliers = async (suppliers, branchId) => {
    const items = [];
    const totals = {
        remaining_opening_balance: 0,
        remaining_credit_invoices: 0,
        total: 0,
    };

    for (const supplier of suppliers) {
        const balances = await computeSupplierPayables(supplier, branchId);
        items.push({ supplier, balances });
        totals.remaining_opening_balance += balances.remaining_opening_balance;
        totals.remaining_credit_invoices += balances.remaining_credit_invoices;
        totals.total += balances.total;
    }

    return { items, totals };
};

export const listPayables = async (req, { search } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = await scopedCatalogWhere(req, searchWhere(search));
    const suppliers = await Supplier.findAll({
        where,
        order: [['name', 'ASC']],
    });

    return buildPayablesForSuppliers(suppliers, branchId);
};

export const payablesReport = async (req, { search } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = await scopedCatalogWhere(req, searchWhere(search));
    const suppliers = await Supplier.findAll({
        where,
        order: [['supplier_code', 'ASC']],
    });

    return buildPayablesForSuppliers(suppliers, branchId);
};

export const suppliersWithBalancesReport = async (req, { search } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = await scopedCatalogWhere(req, searchWhere(search));
    const suppliers = await Supplier.findAll({
        where,
        order: [['name', 'ASC']],
    });

    const items = [];
    let totalRemaining = 0;

    for (const supplier of suppliers) {
        const balances = await computeSupplierPayables(supplier, branchId);
        if (balances.total <= 0) continue;
        items.push({ supplier, balances });
        totalRemaining += balances.total;
    }

    return {
        items,
        totals: { total_remaining: totalRemaining },
    };
};

export default {
    CatalogScopeError,
    findSupplierInScope,
    searchSuppliers,
    listSuppliers,
    listOpeningBalances,
    updateOpeningBalance,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    listPayables,
    payablesReport,
    suppliersWithBalancesReport,
};
