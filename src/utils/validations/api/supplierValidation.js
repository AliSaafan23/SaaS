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

const optionalSupplierFields = () => [
    body('phone').optional({ values: 'falsy' }).trim(),
    body('address').optional({ values: 'falsy' }).trim(),
    body('tax_number').optional({ values: 'falsy' }).trim(),
    body('material_number').optional({ values: 'falsy' }).trim(),
    body('commercial_register').optional({ values: 'falsy' }).trim(),
    body('statistical_number').optional({ values: 'falsy' }).trim(),
    optionalDecimal('opening_credit'),
    optionalDecimal('opening_debit'),
];

const supplierValidation = {
    validateListSuppliers() {
        return withMiddleware([
            query('page').optional().isInt({ min: 1 }),
            query('limit').optional().isInt({ min: 1, max: 200 }),
            query('search').optional({ values: 'falsy' }).trim(),
        ]);
    },

    validateSupplierId() {
        return withMiddleware([idParam()]);
    },

    validateSupplierSearch() {
        return withMiddleware([
            query('search')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('searchRequired'))),
            query('limit').optional().isInt({ min: 1, max: 50 }),
        ]);
    },

    validateCreateSupplier() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('supplierNameRequired'))),
            ...optionalSupplierFields(),
        ]);
    },

    validateUpdateSupplier() {
        return withMiddleware([
            idParam(),
            body('name')
                .optional({ values: 'falsy' })
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('supplierNameRequired'))),
            ...optionalSupplierFields(),
        ]);
    },

    validateOpeningBalanceSearch() {
        return withMiddleware([
            query('search').optional({ values: 'falsy' }).trim(),
            query('format').optional({ values: 'falsy' }).isIn(['json', 'pdf']),
            query('download').optional({ values: 'falsy' }).isIn(['1', '0']),
        ]);
    },

    validateUpdateOpeningBalance() {
        return withMiddleware([
            idParam(),
            optionalDecimal('opening_credit'),
            optionalDecimal('opening_debit'),
            body('opening_credit')
                .optional({ values: 'falsy' })
                .custom((_, { req }) => {
                    const hasCredit = Object.prototype.hasOwnProperty.call(
                        req.body || {},
                        'opening_credit'
                    );
                    const hasDebit = Object.prototype.hasOwnProperty.call(
                        req.body || {},
                        'opening_debit'
                    );
                    if (!hasCredit && !hasDebit) throw new Error('openingBalanceRequired');
                    return true;
                })
                .withMessage(() =>
                    errorRes.responseError('fail', i18n.__('openingBalanceRequired'))
                ),
        ]);
    },
};

export default supplierValidation;
