import { body, param, query } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const invalidNumberMsg = () =>
    errorRes.responseError('fail', i18n.__('invalidNumber'));

const idParam = () =>
    param('id')
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat')));

const customerIdParam = () =>
    param('customerId')
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat')));

/** Accepts 2026-06-1, 2026-06-01, and full ISO timestamps. */
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

const saleItemRules = () =>
    body('items')
        .isArray({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('saleItemsRequired')));

const saleItemFields = () => [
    body('items.*.productId')
        .optional()
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('items.*.product_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('items.*.qty')
        .isFloat({ min: 0.0001 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidSaleQty'))),
    optionalDecimal('items.*.price'),
    optionalDecimal('items.*.discount'),
    optionalDecimal('items.*.tax'),
];

const saleBodyRules = () => [
    body('customerId').optional({ values: 'falsy' }).isInt({ min: 1 }),
    body('salePriceType')
        .optional({ values: 'falsy' })
        .isIn([1, 2, 3, '1', '2', '3'])
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidSalePriceLevel'))),
    body('invoiceDate').optional({ values: 'falsy' }).isISO8601().toDate(),
    optionalDecimal('invoiceDiscount'),
    optionalDecimal('discountPercent'),
    optionalDecimal('paidAmount'),
    body('paymentMethodId')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('payment_method_id')
        .optional({ values: 'falsy' })
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('paymentMethod')
        .optional({ values: 'falsy' })
        .isIn(['cash', 'card', 'credit', 'cheque', 'mixed'])
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPaymentMethod'))),
    body('notes').optional({ values: 'falsy' }).isString().trim(),
    body('payments').optional().isArray(),
    body('payments.*.paymentMethodId')
        .optional()
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    body('payments.*.payment_method_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
    optionalDecimal('payments.*.amount'),
];

export default {
    validateMeta: () => withMiddleware([]),

    validateList: () =>
        withMiddleware([
            query('search').optional({ values: 'falsy' }).isString().trim(),
            query('status')
                .optional({ values: 'falsy' })
                .isIn(['all', 'draft', 'completed', 'cancelled']),
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
        ]),

    validateSaleId: () => withMiddleware([idParam()]),

    validateSaleInvoicePdf: () =>
        withMiddleware([
            idParam(),
            query('download').optional({ values: 'falsy' }).isIn(['0', '1']),
            query('token').optional({ values: 'falsy' }).isString().trim(),
            query('accessToken').optional({ values: 'falsy' }).isString().trim(),
        ]),

    validateCustomerId: () => withMiddleware([customerIdParam()]),

    validateCalculate: () =>
        withMiddleware([saleItemRules(), ...saleItemFields(), ...saleBodyRules()]),

    validateCreate: () =>
        withMiddleware([saleItemRules(), ...saleItemFields(), ...saleBodyRules()]),

    validateUpdate: () =>
        withMiddleware([idParam(), saleItemRules(), ...saleItemFields(), ...saleBodyRules()]),

    validateCustomerDebtPayment: () =>
        withMiddleware([
            customerIdParam(),
            body('amount')
                .isFloat({ min: 0.01 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPaymentAmount'))),
            body('paymentMethodId')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            body('payment_method_id')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            body('paymentMethod')
                .optional({ values: 'falsy' })
                .isIn(['cash', 'card', 'credit', 'cheque'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPaymentMethod'))),
            body('paymentDate').optional({ values: 'falsy' }).isISO8601().toDate(),
            body('notes').optional({ values: 'falsy' }).isString().trim(),
        ]),

    validateListCustomerPayments: () =>
        withMiddleware([
            query('search').optional({ values: 'falsy' }).isString().trim(),
            query('customerId')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            query('paymentMethodId')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            optionalDateQuery('dateFrom'),
            optionalDateQuery('dateTo'),
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
        ]),

    validateListCustomerPaymentsByCustomer: () =>
        withMiddleware([
            customerIdParam(),
            query('paymentMethodId')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            optionalDateQuery('dateFrom'),
            optionalDateQuery('dateTo'),
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 100 }),
        ]),
};
