import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const subscriptionValidation = {
    validateIdParam() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('customerId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('customerIdRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('planId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('planIdRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('startDate')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('startDateRequired')))
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
            body('status')
                .optional()
                .isIn(['active', 'cancelled', 'paused'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidStatus'))),
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('status')
                .optional()
                .isIn(['active', 'cancelled', 'paused'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidStatus'))),
            body('nextBillingDate')
                .optional()
                .isISO8601()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDate'))),
        ]);
    },
};

export default subscriptionValidation;
