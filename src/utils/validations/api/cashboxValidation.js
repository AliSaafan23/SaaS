import { body, query } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

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

const optionalMoneyBody = (field) =>
    body(field)
        .optional({ values: 'falsy' })
        .customSanitizer((val) => (val === undefined || val === null || val === '' ? undefined : Number(val)))
        .custom((val) => {
            if (val === undefined) return true;
            if (!Number.isFinite(val) || val < 0) throw new Error('invalidAmount');
            return true;
        })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPaymentAmount')));

export default {
    validateShiftSummary: () =>
        withMiddleware([
            optionalDateQuery('dateFrom'),
            optionalDateQuery('dateTo'),
            query('cashierId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            query('shiftId').optional({ values: 'falsy' }).isInt({ min: 1 }),
        ]),

    validateOpenShift: () =>
        withMiddleware([
            optionalMoneyBody('openingCash'),
            body('notes').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }),
        ]),

    validateCloseShift: () =>
        withMiddleware([
            optionalMoneyBody('closingCash'),
            body('notes').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }),
        ]),
};
