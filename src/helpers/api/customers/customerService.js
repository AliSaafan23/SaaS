import { Op, fn, col, where as seqWhere } from 'sequelize';
import { Customer, Sale } from '../../../models/index.js';
import {
    requireCatalogTenant,
    scopedCatalogWhere,
    CatalogScopeError,
} from '../inventory/catalogScope.js';
import {
    parseDecimal,
    mergeOpeningBalance,
    computeCustomerReceivables,
} from './customerBalance.js';

export { CatalogScopeError };

const searchWhere = (search) => {
    if (!search?.trim()) return {};
    const term = `%${search.trim()}%`;
    return {
        [Op.or]: [
            { name: { [Op.like]: term } },
            { phone: { [Op.like]: term } },
            { barcode: { [Op.like]: term } },
            { customer_code: { [Op.like]: term } },
        ],
    };
};

/** Opening balances screen: name, barcode, phone. */
const openingBalanceSearchWhere = (search) => {
    if (!search?.trim()) return {};
    const term = search.trim();
    return {
        [Op.or]: [
            caseInsensitiveLike('name', term),
            caseInsensitiveLike('barcode', term),
            caseInsensitiveLike('phone', term),
        ],
    };
};

export const generateCustomerBarcode = () => {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `C${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
};

const generateCustomerCode = async (companyId, branchId) => {
    const last = await Customer.findOne({
        where: { companyId, branchId },
        order: [['id', 'DESC']],
        attributes: ['customer_code'],
    });

    const numeric = Number.parseInt(String(last?.customer_code || '0'), 10);
    const next = Number.isFinite(numeric) && numeric > 0 ? numeric + 1 : 1;
    return String(next);
};

export const findCustomerInScope = async (req, customerId) => {
    const where = await scopedCatalogWhere(req, { id: customerId });
    return Customer.findOne({ where });
};

const caseInsensitiveLike = (column, term) =>
    seqWhere(fn('LOWER', col(column)), {
        [Op.like]: `%${String(term).trim().toLowerCase()}%`,
    });

export const searchCustomers = async (req, term, { limit = 50 } = {}) => {
    const q = String(term || '').trim();
    if (!q) return [];

    const baseWhere = await scopedCatalogWhere(req, openingBalanceSearchWhere(q));
    const pageLimit = Math.min(50, Math.max(1, Number(limit) || 50));

    return Customer.findAll({
        where: baseWhere,
        order: [
            ['name', 'ASC'],
            ['barcode', 'ASC'],
        ],
        limit: pageLimit,
    });
};

export const searchCustomersByBarcode = async (req, term, { limit = 50 } = {}) => {
    const q = String(term || '').trim();
    if (!q) return [];

    const baseWhere = await scopedCatalogWhere(req, {});
    const pageLimit = Math.min(50, Math.max(1, Number(limit) || 50));

    return Customer.findAll({
        where: {
            ...baseWhere,
            [Op.and]: [caseInsensitiveLike('barcode', q)],
        },
        order: [
            ['barcode', 'ASC'],
            ['name', 'ASC'],
        ],
        limit: pageLimit,
    });
};

const assertUniqueBarcode = async (companyId, branchId, barcode, excludeId = null) => {
    if (!barcode) return;
    const where = { companyId, branchId, barcode };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const existing = await Customer.findOne({ where });
    if (existing) throw new CatalogScopeError('customerBarcodeAlreadyExists');
};

const normalizeCustomerPayload = (data) => {
    const payload = { ...data };

    if (payload.name) payload.name = String(payload.name).trim();
    if (payload.phone !== undefined) {
        payload.phone = payload.phone ? String(payload.phone).trim() : null;
    }
    if (payload.address !== undefined) {
        payload.address = payload.address ? String(payload.address).trim() : null;
    }
    if (payload.barcode !== undefined) {
        payload.barcode = payload.barcode ? String(payload.barcode).trim() : null;
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

    if (payload.price_level !== undefined && payload.price_level !== null && payload.price_level !== '') {
        payload.price_level = Number(payload.price_level);
    }

    if (payload.credit_limit !== undefined) {
        payload.credit_limit = parseDecimal(payload.credit_limit);
    }
    if (payload.late_days_limit !== undefined) {
        payload.late_days_limit = Math.max(0, Math.trunc(parseDecimal(payload.late_days_limit)));
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

export const listCustomers = async (req, options = {}) => {
    const { search, page = 1, limit = 50 } = options;
    const where = await scopedCatalogWhere(req, searchWhere(search));

    const offset = (Math.max(1, Number(page)) - 1) * Math.min(200, Math.max(1, Number(limit)));
    const pageLimit = Math.min(200, Math.max(1, Number(limit)));

    const { rows, count } = await Customer.findAndCountAll({
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
    const where = await scopedCatalogWhere(req, openingBalanceSearchWhere(search));
    return Customer.findAll({
        where,
        order: [['customer_code', 'ASC']],
        attributes: ['id', 'customer_code', 'name', 'opening_balance'],
    });
};

export const updateOpeningBalance = async (req, customerId, data) => {
    const customer = await findCustomerInScope(req, customerId);
    if (!customer) throw new CatalogScopeError('customerNotFound');

    const payload = normalizeCustomerPayload(data);
    if (payload.opening_balance === undefined) {
        throw new CatalogScopeError('openingBalanceRequired');
    }

    await customer.update({ opening_balance: payload.opening_balance });
    return customer.reload();
};

export const createCustomer = async (req, data) => {
    const { companyId, branchId } = await requireCatalogTenant(req);
    const payload = normalizeCustomerPayload(data);

    const barcode = payload.barcode || generateCustomerBarcode();
    await assertUniqueBarcode(companyId, branchId, barcode);

    const customer_code = await generateCustomerCode(companyId, branchId);

    return Customer.create({
        customer_code,
        barcode,
        name: payload.name,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        tax_number: payload.tax_number ?? null,
        material_number: payload.material_number ?? null,
        commercial_register: payload.commercial_register ?? null,
        statistical_number: payload.statistical_number ?? null,
        price_level: payload.price_level ?? 0,
        credit_limit: payload.credit_limit ?? 0,
        late_days_limit: payload.late_days_limit ?? 0,
        opening_balance: payload.opening_balance ?? 0,
        companyId,
        branchId,
    });
};

export const updateCustomer = async (req, customerId, data) => {
    const { companyId, branchId } = await requireCatalogTenant(req);
    const customer = await findCustomerInScope(req, customerId);
    if (!customer) throw new CatalogScopeError('customerNotFound');

    const payload = normalizeCustomerPayload(data);

    if (payload.barcode !== undefined) {
        const barcode = payload.barcode || generateCustomerBarcode();
        await assertUniqueBarcode(companyId, branchId, barcode, customerId);
        payload.barcode = barcode;
    }

    if (payload.name !== undefined && !payload.name) {
        throw new CatalogScopeError('customerNameRequired');
    }

    await customer.update(payload);
    return customer.reload();
};

export const deleteCustomer = async (req, customerId) => {
    const customer = await findCustomerInScope(req, customerId);
    if (!customer) throw new CatalogScopeError('customerNotFound');

    const salesCount = await Sale.count({ where: { customer_id: customerId } });
    if (salesCount > 0) throw new CatalogScopeError('customerHasSales');

    await customer.destroy();
    return true;
};

const buildReceivablesForCustomers = async (customers, branchId) => {
    const items = [];
    const totals = {
        remaining_opening_balance: 0,
        remaining_credit_invoices: 0,
        total: 0,
    };

    for (const customer of customers) {
        const balances = await computeCustomerReceivables(customer, branchId);
        if (balances.total <= 0) continue;

        items.push({ customer, balances });
        totals.remaining_opening_balance += balances.remaining_opening_balance;
        totals.remaining_credit_invoices += balances.remaining_credit_invoices;
        totals.total += balances.total;
    }

    return { items, totals };
};

export const listReceivables = async (req, { search } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = await scopedCatalogWhere(req, searchWhere(search));
    const customers = await Customer.findAll({
        where,
        order: [['name', 'ASC']],
    });

    return buildReceivablesForCustomers(customers, branchId);
};

export const receivablesReport = async (req, { search } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = await scopedCatalogWhere(req, searchWhere(search));
    const customers = await Customer.findAll({
        where,
        order: [['customer_code', 'ASC']],
    });

    return buildReceivablesForCustomers(customers, branchId);
};

export const customersWithBalancesReport = async (req, { search } = {}) => {
    const { branchId } = await requireCatalogTenant(req);
    const where = await scopedCatalogWhere(req, searchWhere(search));
    const customers = await Customer.findAll({
        where,
        order: [['name', 'ASC']],
    });

    const items = [];
    let totalRemaining = 0;

    for (const customer of customers) {
        const balances = await computeCustomerReceivables(customer, branchId);
        if (balances.total <= 0) continue;
        items.push({ customer, balances });
        totalRemaining += balances.total;
    }

    return {
        items,
        totals: { total_remaining: totalRemaining },
    };
};

export default {
    CatalogScopeError,
    generateCustomerBarcode,
    findCustomerInScope,
    searchCustomers,
    searchCustomersByBarcode,
    listCustomers,
    listOpeningBalances,
    updateOpeningBalance,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    listReceivables,
    receivablesReport,
    customersWithBalancesReport,
};
