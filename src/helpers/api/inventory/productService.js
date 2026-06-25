import { Op, where, col } from 'sequelize';
import { Product } from '../../../models/index.js';
import {
    requireCatalogTenant,
    scopedCatalogWhere,
    findScopedCategory,
    findScopedUnit,
    CatalogScopeError,
} from './catalogScope.js';
import { saveProductImage, removeProductImage } from './productImage.js';
import { computeAdjustedPrice, resolveTargetPriceFields } from './priceAdjust.js';

const productIncludes = [
    { association: 'category', attributes: ['id', 'name'], required: false },
    { association: 'baseUnit', attributes: ['id', 'name'], required: false },
    { association: 'largeUnit', attributes: ['id', 'name'], required: false },
];

const parseDecimal = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(typeof value === 'object' && value?.toString ? value.toString() : value);
    return Number.isFinite(n) ? n : fallback;
};

export const isLowStockProduct = (product) => {
    const qty = parseDecimal(product?.quantity);
    const reorder = parseDecimal(product?.reorder_level);
    return reorder > 0 && qty <= reorder;
};

export const generateBarcode = () => {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
};

const normalizeProductPayload = async (req, data) => {
    const payload = { ...data };

    if (payload.category_id) {
        const category = await findScopedCategory(req, payload.category_id);
        if (!category) throw new CatalogScopeError('categoryNotFound');
    }

    if (payload.base_unit_id) {
        const unit = await findScopedUnit(req, payload.base_unit_id);
        if (!unit) throw new CatalogScopeError('unitNotFound');
    }

    if (payload.large_unit_id) {
        const unit = await findScopedUnit(req, payload.large_unit_id);
        if (!unit) throw new CatalogScopeError('unitNotFound');
    }

    return payload;
};

export const findProductInScope = async (req, productId, { status } = {}) => {
    const where = await scopedCatalogWhere(req, { id: productId });
    if (status) where.status = status;
    return Product.findOne({ where, include: productIncludes });
};

export const findProductByBarcode = async (req, barcode, { status = 'active' } = {}) => {
    const where = await scopedCatalogWhere(req, { barcode: String(barcode).trim() });
    if (status) where.status = status;
    return Product.findOne({ where, include: productIncludes });
};

export const listProducts = async (req, options = {}) => {
    const {
        search,
        category_id,
        status = 'active',
        page = 1,
        limit = 50,
    } = options;

    const where = await scopedCatalogWhere(req, {});
    if (status && status !== 'all') where.status = status;

    if (category_id) where.category_id = category_id;

    if (search?.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
            { name: { [Op.like]: term } },
            { barcode: { [Op.like]: term } },
        ];
    }

    const offset = (Math.max(1, Number(page)) - 1) * Math.min(200, Math.max(1, Number(limit)));
    const pageLimit = Math.min(200, Math.max(1, Number(limit)));

    const { rows, count } = await Product.findAndCountAll({
        where,
        include: productIncludes,
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

export const listLowStockProducts = async (req) => {
    const baseWhere = await scopedCatalogWhere(req, { status: 'active' });

    return Product.findAll({
        where: {
            ...baseWhere,
            reorder_level: { [Op.gt]: 0 },
            [Op.and]: [
                where(col('Product.quantity'), Op.lte, col('Product.reorder_level')),
            ],
        },
        include: productIncludes,
        order: [[col('Product.quantity'), 'ASC']],
    });
};

export const createProduct = async (req, data) => {
    const { companyId, branchId } = await requireCatalogTenant(req);
    const payload = await normalizeProductPayload(req, data);

    const barcode = payload.barcode?.trim() || generateBarcode();
    const duplicate = await Product.findOne({
        where: { companyId, branchId, barcode },
    });
    if (duplicate) throw new CatalogScopeError('barcodeAlreadyExists');

    const image = await saveProductImage(req);

    return Product.create({
        barcode,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        image,
        companyId,
        branchId,
        category_id: payload.category_id || null,
        brand_id: payload.brand_id || null,
        cost_price: parseDecimal(payload.cost_price),
        sale_price_1: parseDecimal(payload.sale_price_1),
        sale_price_2: parseDecimal(payload.sale_price_2),
        sale_price_3: parseDecimal(payload.sale_price_3),
        quantity: parseDecimal(payload.quantity),
        reorder_level: parseDecimal(payload.reorder_level),
        tax_percent: parseDecimal(payload.tax_percent),
        expiry_date: payload.expiry_date || null,
        base_unit_id: payload.base_unit_id || null,
        large_unit_id: payload.large_unit_id || null,
        units_count: parseDecimal(payload.units_count, 1) || 1,
        status: 'active',
    });
};

export const updateProduct = async (req, productId, data) => {
    const product = await findProductInScope(req, productId, { status: 'active' });
    if (!product) throw new CatalogScopeError('productNotFound');

    const payload = await normalizeProductPayload(req, data);

    if (payload.barcode && payload.barcode.trim() !== product.barcode) {
        const duplicate = await Product.findOne({
            where: {
                companyId: product.companyId,
                branchId: product.branchId,
                barcode: payload.barcode.trim(),
                id: { [Op.ne]: product.id },
            },
        });
        if (duplicate) throw new CatalogScopeError('barcodeAlreadyExists');
    }

    const image = await saveProductImage(req);
    if (image) {
        await removeProductImage(product.image);
    }

    const updates = {};
    const fields = [
        'name',
        'description',
        'category_id',
        'brand_id',
        'cost_price',
        'sale_price_1',
        'sale_price_2',
        'sale_price_3',
        'quantity',
        'reorder_level',
        'tax_percent',
        'expiry_date',
        'base_unit_id',
        'large_unit_id',
        'units_count',
        'barcode',
    ];

    fields.forEach((field) => {
        if (payload[field] !== undefined && payload[field] !== null) {
            if (['cost_price', 'sale_price_1', 'sale_price_2', 'sale_price_3', 'quantity', 'reorder_level', 'tax_percent', 'units_count'].includes(field)) {
                updates[field] = parseDecimal(payload[field]);
            } else if (field === 'name' || field === 'description' || field === 'barcode') {
                updates[field] = String(payload[field]).trim();
            } else {
                updates[field] = payload[field];
            }
        }
    });

    if (image) updates.image = image;

    await product.update(updates);
    return findProductInScope(req, productId, { status: 'active' });
};

export const bulkUpdatePrices = async (req, items = []) => {
    const results = [];
    for (const item of items) {
        const product = await findProductInScope(req, item.id, { status: 'active' });
        if (!product) {
            results.push({ id: item.id, success: false, error: 'productNotFound' });
            continue;
        }

        const updates = {};
        ['cost_price', 'sale_price_1', 'sale_price_2', 'sale_price_3'].forEach((field) => {
            if (item[field] !== undefined) updates[field] = parseDecimal(item[field]);
        });

        if (Object.keys(updates).length) {
            await product.update(updates);
        }
        results.push({ id: item.id, success: true });
    }
    return results;
};

/**
 * Adjust prices for all active products in a category (or entire branch if category_id omitted).
 * Supports: percentage, fixed_amount, exchange_rate × direction increase/decrease.
 */
export const adjustProductPrices = async (req, options) => {
    const {
        direction = 'increase',
        priceType = 'sale',
        salePriceLevels = [1],
        category_id = null,
        method = 'percentage',
        value = 0,
    } = options;

    if (category_id) {
        const category = await findScopedCategory(req, category_id);
        if (!category) throw new CatalogScopeError('categoryNotFound');
    }

    const targetFields = resolveTargetPriceFields({ priceType, salePriceLevels });
    if (!targetFields.length) {
        throw new CatalogScopeError('salePriceLevelsRequired');
    }

    if (method !== 'exchange_rate' && parseDecimal(value) <= 0) {
        throw new CatalogScopeError('adjustValueRequired');
    }

    if (method === 'exchange_rate' && parseDecimal(value) <= 0) {
        throw new CatalogScopeError('adjustValueRequired');
    }

    const where = await scopedCatalogWhere(req, { status: 'active' });
    if (category_id) where.category_id = category_id;

    const products = await Product.findAll({ where });

    const updated = [];
    for (const product of products) {
        const updates = {};
        const costPrice = parseDecimal(product.cost_price);

        targetFields.forEach((field) => {
            const current = parseDecimal(product[field]);
            updates[field] = computeAdjustedPrice(current, {
                direction,
                method,
                value,
                costPrice,
            });
        });

        await product.update(updates);
        updated.push({
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            ...updates,
        });
    }

    return {
        updatedCount: updated.length,
        category_id: category_id ?? null,
        priceType,
        method,
        direction: method === 'exchange_rate' ? null : direction,
        salePriceLevels: priceType === 'sale' ? salePriceLevels : [],
        items: updated,
    };
};

export const bulkChangeCategory = async (req, { productIds = [], category_id }) => {
    if (category_id) {
        const category = await findScopedCategory(req, category_id);
        if (!category) throw new CatalogScopeError('categoryNotFound');
    }

    const where = await scopedCatalogWhere(req, {
        id: { [Op.in]: productIds },
        status: 'active',
    });

    const [count] = await Product.update(
        { category_id: category_id || null },
        { where }
    );

    return { updated: count };
};

export const softDeleteProduct = async (req, productId) => {
    const product = await findProductInScope(req, productId, { status: 'active' });
    if (!product) throw new CatalogScopeError('productNotFound');
    await product.update({ status: 'inactive' });
    return product;
};

export const restoreProduct = async (req, productId) => {
    const product = await findProductInScope(req, productId, { status: 'inactive' });
    if (!product) throw new CatalogScopeError('productNotFound');
    await product.update({ status: 'active' });
    return findProductInScope(req, productId, { status: 'active' });
};

export const permanentDeleteProduct = async (req, productId) => {
    const product = await findProductInScope(req, productId, { status: 'inactive' });
    if (!product) throw new CatalogScopeError('productNotFound');
    await removeProductImage(product.image);
    await product.destroy();
    return true;
};

export const bulkRestoreProducts = async (req, productIds = []) => {
    const where = await scopedCatalogWhere(req, {
        id: { [Op.in]: productIds },
        status: 'inactive',
    });
    const [count] = await Product.update({ status: 'active' }, { where });
    return { restored: count };
};

export const bulkPermanentDeleteProducts = async (req, productIds = []) => {
    const where = await scopedCatalogWhere(req, {
        id: { [Op.in]: productIds },
        status: 'inactive',
    });
    const products = await Product.findAll({ where });
    for (const p of products) {
        await removeProductImage(p.image);
        await p.destroy();
    }
    return { deleted: products.length };
};

export default {
    generateBarcode,
    listProducts,
    isLowStockProduct,
    listLowStockProducts,
    findProductInScope,
    findProductByBarcode,
    createProduct,
    updateProduct,
    bulkUpdatePrices,
    adjustProductPrices,
    bulkChangeCategory,
    softDeleteProduct,
    restoreProduct,
    permanentDeleteProduct,
    bulkRestoreProducts,
    bulkPermanentDeleteProducts,
};
