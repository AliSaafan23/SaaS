import { sharedVariable } from '../../../config/index.js';
import { isLowStockProduct } from './productService.js';

const productImageUrl = (image) =>
    image ? `${sharedVariable.address}${sharedVariable.productsImage}${image}` : '';

const unitLabel = (product) => {
    const unit = product.baseUnit || product.base_unit;
    return unit?.name ? `[${unit.name}]` : '';
};

const returnObject = {
    category: (item) => ({
        id: item.id,
        name: item.name,
        companyId: item.companyId,
        branchId: item.branchId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    unit: (item) => ({
        id: item.id,
        name: item.name,
        companyId: item.companyId,
        branchId: item.branchId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    product: (item) => ({
        id: item.id,
        barcode: item.barcode,
        name: item.name,
        displayName: `${item.name}${unitLabel(item) ? ` ${unitLabel(item)}` : ''}`.trim(),
        description: item.description,
        image: productImageUrl(item.image),
        imageFile: item.image || null,
        companyId: item.companyId,
        branchId: item.branchId,
        category_id: item.category_id,
        category: item.category
            ? { id: item.category.id, name: item.category.name }
            : null,
        brand_id: item.brand_id,
        cost_price: Number(item.cost_price),
        sale_price_1: Number(item.sale_price_1),
        sale_price_2: Number(item.sale_price_2),
        sale_price_3: Number(item.sale_price_3),
        quantity: Number(item.quantity),
        reorder_level: Number(item.reorder_level),
        tax_percent: Number(item.tax_percent),
        expiry_date: item.expiry_date,
        base_unit_id: item.base_unit_id,
        baseUnit: item.baseUnit
            ? { id: item.baseUnit.id, name: item.baseUnit.name }
            : null,
        large_unit_id: item.large_unit_id,
        largeUnit: item.largeUnit
            ? { id: item.largeUnit.id, name: item.largeUnit.name }
            : null,
        units_count: Number(item.units_count),
        status: item.status,
        isLowStock: isLowStockProduct(item),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    productList: (items) => items.map((item) => returnObject.product(item)),

    importResult: (result) => ({
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
    }),
};

export default returnObject;
