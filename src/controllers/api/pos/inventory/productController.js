import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';
import productService from '../../../../helpers/api/inventory/productService.js';
import inventoryReturnObject from '../../../../helpers/api/inventory/inventoryReturnObject.js';
import { importProductsFromExcel } from '../../../../helpers/api/inventory/productImport.js';
import { normalizeSalePriceLevels } from '../../../../helpers/api/inventory/priceAdjust.js';
import { normalizeIdList } from '../../../../helpers/api/inventory/arrayNormalize.js';
import {
    buildProductsExportWorkbook,
    buildImportTemplateWorkbook,
} from '../../../../helpers/api/inventory/productExport.js';
import { getDefaultImportMapping } from '../../../../helpers/api/inventory/productExcelColumns.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const handleInventoryError = (res, err) => {
    if (err instanceof CatalogScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('inventory error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

const parseImportMapping = (req) => {
    const raw = req.body?.mapping;
    if (!raw) return getDefaultImportMapping();
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return getDefaultImportMapping();
        try {
            const parsed = JSON.parse(trimmed);
            return Object.keys(parsed || {}).length ? parsed : getDefaultImportMapping();
        } catch {
            return getDefaultImportMapping();
        }
    }
    return Object.keys(raw || {}).length ? raw : getDefaultImportMapping();
};

export default {
    list: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const result = await productService.listProducts(req, {
                search: query.search || req.query.search,
                category_id: query.category_id || req.query.category_id,
                status: query.status || req.query.status || 'active',
                page: query.page || req.query.page || 1,
                limit: query.limit || req.query.limit || 50,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: inventoryReturnObject.productList(result.items),
                    pagination: result.pagination,
                })
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    lowStock: async (req, res) => {
        try {
            const items = await productService.listLowStockProducts(req);
            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: inventoryReturnObject.productList(items),
                })
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    deleted: async (req, res) => {
        try {
            const result = await productService.listProducts(req, {
                search: req.query.search,
                status: 'inactive',
                page: req.query.page || 1,
                limit: req.query.limit || 50,
            });
            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: inventoryReturnObject.productList(result.items),
                    pagination: result.pagination,
                })
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const product = await productService.findProductInScope(req, id, {});
            if (!product) {
                return errorHandler(res, 'notFound', 'productNotFound');
            }
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    inventoryReturnObject.product(product)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    getByBarcode: async (req, res) => {
        try {
            const { barcode } = matchedData(req, { locations: ['params'] });
            const product = await productService.findProductByBarcode(req, barcode);
            if (!product) {
                return errorHandler(res, 'notFound', 'productNotFound');
            }
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    inventoryReturnObject.product(product)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const data = matchedData(req);
            const created = await productService.createProduct(req, data);
            const product = await productService.findProductInScope(req, created.id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('productCreated'),
                    201,
                    inventoryReturnObject.product(product)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    update: async (req, res) => {
        try {
            const data = matchedData(req, { locations: ['body', 'params'] });
            const { id } = data;
            const product = await productService.updateProduct(req, id, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('productUpdated'),
                    200,
                    inventoryReturnObject.product(product)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    bulkUpdatePrices: async (req, res) => {
        try {
            const { items } = matchedData(req);
            const results = await productService.bulkUpdatePrices(req, items);
            res.send(
                new ApiResponse('success', i18n.__('productPricesUpdated'), 200, { results })
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    adjustPrices: async (req, res) => {
        try {
            const data = matchedData(req);
            const priceType = data.priceType || req.body?.priceType;
            const salePriceLevels =
                priceType === 'sale'
                    ? normalizeSalePriceLevels(data.salePriceLevels ?? req.body?.salePriceLevels) || [1]
                    : [];

            const result = await productService.adjustProductPrices(req, {
                direction: data.direction || req.body?.direction || 'increase',
                priceType,
                salePriceLevels,
                category_id: data.category_id ? Number(data.category_id) : null,
                method: data.method || req.body?.method,
                value: Number(data.value ?? req.body?.value),
            });

            res.send(
                new ApiResponse('success', i18n.__('productPricesAdjusted'), 200, result)
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    bulkChangeCategory: async (req, res) => {
        try {
            const data = matchedData(req);
            const productIds = normalizeIdList(data.productIds ?? req.body?.productIds);
            const category_id = data.category_id ?? req.body?.category_id;

            const result = await productService.bulkChangeCategory(req, {
                productIds,
                category_id: category_id ? Number(category_id) : null,
            });
            res.send(
                new ApiResponse('success', i18n.__('productCategoryUpdated'), 200, result)
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    softDelete: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            await productService.softDeleteProduct(req, id);
            res.send(new ApiResponse('success', i18n.__('productDeleted'), 200, {}));
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    restore: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const product = await productService.restoreProduct(req, id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('productRestored'),
                    200,
                    inventoryReturnObject.product(product)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    permanentDelete: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            await productService.permanentDeleteProduct(req, id);
            res.send(new ApiResponse('success', i18n.__('productPermanentlyDeleted'), 200, {}));
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    bulkRestore: async (req, res) => {
        try {
            const data = matchedData(req);
            const productIds = normalizeIdList(data.productIds ?? req.body?.productIds);
            const result = await productService.bulkRestoreProducts(req, productIds);
            res.send(new ApiResponse('success', i18n.__('productsRestored'), 200, result));
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    bulkPermanentDelete: async (req, res) => {
        try {
            const data = matchedData(req);
            const productIds = normalizeIdList(data.productIds ?? req.body?.productIds);
            const result = await productService.bulkPermanentDeleteProducts(req, productIds);
            res.send(
                new ApiResponse('success', i18n.__('productsPermanentlyDeleted'), 200, result)
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    importExcel: async (req, res) => {
        try {
            const file = req.files?.file || req.files?.excel;
            if (!file) {
                return errorHandler(res, 'fail', 'excelFileRequired');
            }

            const mapping = parseImportMapping(req);
            const buffer = file.data || file.buffer;
            const result = await importProductsFromExcel(req, buffer, mapping);

            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('productsImported'),
                    200,
                    inventoryReturnObject.importResult(result)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    exportExcel: async (req, res) => {
        try {
            const wb = await buildProductsExportWorkbook(req, lang(req));
            const buffer = await wb.xlsx.writeBuffer();
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="products-export.xlsx"'
            );
            return res.send(buffer);
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    exportTemplate: async (req, res) => {
        try {
            const wb = buildImportTemplateWorkbook(lang(req));
            const buffer = await wb.xlsx.writeBuffer();
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="products-import-template.xlsx"'
            );
            return res.send(buffer);
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },
};
