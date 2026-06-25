import { body, param, query } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';
import { normalizeSalePriceLevels } from '../../../helpers/api/inventory/priceAdjust.js';
import { normalizeIdList } from '../../../helpers/api/inventory/arrayNormalize.js';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const invalidNumberMsg = () =>
    errorRes.responseError('fail', i18n.__('invalidNumber'));

/** Accept JSON numbers and form-data string numbers (Postman multipart). */
const optionalDecimal = (field) =>
    body(field)
        .optional({ values: 'falsy' })
        .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
        .custom((val) => {
            if (val === undefined || val === null || val === '') return true;
            const n = Number(val);
            if (!Number.isFinite(n) || n < 0) throw new Error('invalidNumber');
            return true;
        })
        .withMessage(invalidNumberMsg);

const optionalIntId = (field) =>
    body(field)
        .optional({ values: 'falsy' })
        .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
        .custom((val) => {
            if (val === undefined || val === null || val === '') return true;
            if (!/^\d+$/.test(String(val))) throw new Error('invalidNumber');
            if (Number(val) < 1) throw new Error('invalidNumber');
            return true;
        })
        .withMessage(invalidNumberMsg);

const idParam = () =>
    param('id')
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat')));

const barcodeParam = () =>
    param('barcode')
        .trim()
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('barcodeRequired')));

const inventoryValidation = {
    validateListProducts() {
        return withMiddleware([
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 200 }),
            query('category_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
            query('search').optional({ values: 'falsy' }).trim(),
            query('status').optional().isIn(['active', 'inactive', 'all']),
        ]);
    },

    validateCreateProduct() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('productNameRequired'))),
            body('barcode').optional({ values: 'falsy' }).trim(),
            body('description').optional({ values: 'falsy' }).trim(),
            optionalIntId('category_id'),
            optionalIntId('base_unit_id'),
            optionalIntId('large_unit_id'),
            optionalDecimal('cost_price'),
            optionalDecimal('sale_price_1'),
            optionalDecimal('sale_price_2'),
            optionalDecimal('sale_price_3'),
            optionalDecimal('quantity'),
            optionalDecimal('reorder_level'),
            optionalDecimal('tax_percent'),
            optionalDecimal('units_count'),
            body('expiry_date')
                .optional({ values: 'falsy' })
                .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateUpdateProduct() {
        return withMiddleware([
            idParam(),
            body('name').optional({ values: 'falsy' }).trim().notEmpty(),
            body('barcode').optional({ values: 'falsy' }).trim(),
            body('description').optional({ values: 'falsy' }).trim(),
            optionalIntId('category_id'),
            optionalIntId('base_unit_id'),
            optionalIntId('large_unit_id'),
            optionalDecimal('cost_price'),
            optionalDecimal('sale_price_1'),
            optionalDecimal('sale_price_2'),
            optionalDecimal('sale_price_3'),
            optionalDecimal('quantity'),
            optionalDecimal('reorder_level'),
            optionalDecimal('tax_percent'),
            optionalDecimal('units_count'),
            body('expiry_date')
                .optional({ values: 'null' })
                .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateProductId() {
        return withMiddleware([idParam()]);
    },

    validateBarcodeLookup() {
        return withMiddleware([barcodeParam()]);
    },

    validateBulkPrices() {
        return withMiddleware([
            body('items')
                .isArray({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('itemsRequired'))),
            body('items.*.id').isInt({ min: 1 }),
            body('items.*.cost_price').optional().isFloat({ min: 0 }),
            body('items.*.sale_price_1').optional().isFloat({ min: 0 }),
            body('items.*.sale_price_2').optional().isFloat({ min: 0 }),
            body('items.*.sale_price_3').optional().isFloat({ min: 0 }),
        ]);
    },

    validateAdjustPrices() {
        return withMiddleware([
            body('direction')
                .optional({ values: 'falsy' })
                .isIn(['increase', 'decrease'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidAdjustDirection'))),
            body('priceType')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('priceTypeRequired')))
                .isIn(['sale', 'purchase'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPriceType'))),
            body('salePriceLevels')
                .optional({ values: 'falsy' })
                .customSanitizer(normalizeSalePriceLevels)
                .custom((val, { req }) => {
                    const priceType = req.body?.priceType;
                    if (priceType === 'purchase') return true;
                    if (val === undefined) return true;
                    if (!Array.isArray(val) || val.length === 0) {
                        throw new Error('salePriceLevelsRequired');
                    }
                    return true;
                })
                .withMessage(() =>
                    errorRes.responseError('fail', i18n.__('salePriceLevelsRequired'))
                ),
            body('category_id')
                .optional({ values: 'null' })
                .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
                .custom((val) => {
                    if (val === undefined || val === null || val === '') return true;
                    if (!/^\d+$/.test(String(val)) || Number(val) < 1) {
                        throw new Error('invalidNumber');
                    }
                    return true;
                })
                .withMessage(invalidNumberMsg),
            body('method')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('adjustMethodRequired')))
                .isIn(['percentage', 'fixed_amount', 'exchange_rate'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidAdjustMethod'))),
            body('value')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('adjustValueRequired')))
                .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
                .custom((val) => {
                    const n = Number(val);
                    if (!Number.isFinite(n) || n < 0) throw new Error('invalidNumber');
                    return true;
                })
                .withMessage(invalidNumberMsg),
        ]);
    },

    validateBulkCategory() {
        return withMiddleware([
            body('productIds')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('itemsRequired')))
                .customSanitizer(normalizeIdList)
                .custom((val) => {
                    if (!Array.isArray(val) || val.length === 0) {
                        throw new Error('itemsRequired');
                    }
                    return true;
                })
                .withMessage(() => errorRes.responseError('fail', i18n.__('itemsRequired'))),
            optionalIntId('category_id'),
        ]);
    },

    validateBulkIds() {
        return withMiddleware([
            body('productIds')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('itemsRequired')))
                .customSanitizer(normalizeIdList)
                .custom((val) => {
                    if (!Array.isArray(val) || val.length === 0) {
                        throw new Error('itemsRequired');
                    }
                    return true;
                })
                .withMessage(() => errorRes.responseError('fail', i18n.__('itemsRequired'))),
        ]);
    },

    validateCreateCategory() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('categoryNameRequired'))),
        ]);
    },

    validateCategoryId() {
        return withMiddleware([idParam()]);
    },

    validateCreateUnit() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('unitNameRequired'))),
        ]);
    },

    validateImportProducts() {
        return withMiddleware([
            body('mapping').optional(),
        ]);
    },
};

export default inventoryValidation;
