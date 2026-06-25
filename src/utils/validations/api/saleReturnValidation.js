import { body, param, query } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const idParam = () =>
    param('id')
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat')));

const saleIdBody = () =>
    body('saleId')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat')));

const saleIdBodyAlt = () =>
    body('sale_id')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat')));

const returnItemRules = () => [
    body('items')
        .isArray({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('saleReturnItemsRequired'))),
    body('items.*.saleItemId')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('items.*.sale_item_id')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('items.*.productId')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('items.*.product_id')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('items.*.qty')
        .isFloat({ min: 0.0001 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidSaleReturnQty'))),
    body('notes').optional({ values: 'falsy' }).isString().trim(),
];

const optionalDateQuery = (field) =>
    query(field)
        .optional({ values: 'falsy' })
        .customSanitizer((val) => (val === undefined || val === null ? val : String(val).trim()))
        .custom((val) => {
            if (val === undefined || val === null || val === '') return true;
            const d = new Date(val);
            if (Number.isNaN(d.getTime())) throw new Error('invalidDate');
            return true;
        })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate')));

export default {
    validateReturnId: () => withMiddleware([idParam()]),

    validateReturnPdf: () =>
        withMiddleware([
            idParam(),
            query('download').optional({ values: 'falsy' }).isIn(['0', '1']),
            query('token').optional({ values: 'falsy' }).isString().trim(),
            query('accessToken').optional({ values: 'falsy' }).isString().trim(),
        ]),

    validateSaleIdParam: () => withMiddleware([idParam()]),

    validateList: () =>
        withMiddleware([
            query('search').optional({ values: 'falsy' }).isString().trim(),
            query('saleId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            optionalDateQuery('dateFrom'),
            optionalDateQuery('dateTo'),
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
        ]),

    validateCalculate: () =>
        withMiddleware([
            saleIdBody(),
            saleIdBodyAlt(),
            body('saleItemId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('sale_item_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('productId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('product_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('qty').optional({ values: 'falsy' }).isFloat({ min: 0.0001 }),
            ...returnItemRules(),
            body().custom((_, { req }) => {
                const saleId = req.body.saleId ?? req.body.sale_id;
                if (!saleId) {
                    throw errorRes.responseError('fail', i18n.__('invalidIdFormat'));
                }
                const hasItems = Array.isArray(req.body.items) && req.body.items.length > 0;
                const hasFlat =
                    (req.body.saleItemId || req.body.sale_item_id || req.body.productId || req.body.product_id) &&
                    req.body.qty;
                if (!hasItems && !hasFlat) {
                    throw errorRes.responseError('fail', i18n.__('saleReturnItemsRequired'));
                }
                return true;
            }),
        ]),

    validateCreate: () =>
        withMiddleware([
            body('saleId')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            body('sale_id')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            body('saleItemId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('sale_item_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('productId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('product_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('qty').optional({ values: 'falsy' }).isFloat({ min: 0.0001 }),
            ...returnItemRules(),
            body().custom((_, { req }) => {
                const saleId = req.body.saleId ?? req.body.sale_id;
                if (!saleId) {
                    throw errorRes.responseError('fail', i18n.__('invalidIdFormat'));
                }
                const hasItems = Array.isArray(req.body.items) && req.body.items.length > 0;
                const hasFlat =
                    (req.body.saleItemId || req.body.sale_item_id || req.body.productId || req.body.product_id) &&
                    req.body.qty;
                if (!hasItems && !hasFlat) {
                    throw errorRes.responseError('fail', i18n.__('saleReturnItemsRequired'));
                }
                return true;
            }),
        ]),
};
