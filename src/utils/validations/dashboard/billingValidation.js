import { body, query } from 'express-validator';
import { ApiError, showErrorsApi } from '../../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const billingValidation = {
    validateRunBilling() {
        return withMiddleware([
            body('runDate')
                .optional()
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateCreatePayment() {
        return withMiddleware([
            body('invoiceId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invoiceIdRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('amount')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('amountRequired')))
                .isFloat({ min: 0.01 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidAmount'))),
            body('paymentDate')
                .optional()
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateRunRevenue() {
        return withMiddleware([
            body('periodEnd')
                .optional()
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateIncomeStatement() {
        return withMiddleware([
            query('from')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('fromDateRequired')))
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
            query('to')
                .optional()
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateBalanceSheet() {
        return withMiddleware([
            query('asOf')
                .optional()
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },

    validateRevenueChart() {
        return withMiddleware([
            query('granularity')
                .optional()
                .isIn(['daily', 'monthly', 'yearly', 'custom'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidGranularity'))),
            query('from')
                .if((value, { req }) => req.query.granularity === 'custom')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('fromDateRequired')))
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
            query('to')
                .if((value, { req }) => req.query.granularity === 'custom')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('toDateRequired')))
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },
};

export default billingValidation;
