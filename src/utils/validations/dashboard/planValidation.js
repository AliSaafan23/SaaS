import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const planValidation = {
    validateIdParam() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('name')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('planNameRequired'))),
            body('price')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('planPriceRequired')))
                .isFloat({ min: 0 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPrice'))),
            body('billingCycle')
                .optional()
                .isIn(['monthly', 'annual'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidBillingCycle'))),
            body('currency')
                .optional()
                .isLength({ min: 3, max: 3 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidCurrency'))),
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('name').optional().notEmpty().withMessage(() => errorRes.responseError('fail', i18n.__('planNameRequired'))),
            body('price').optional().isFloat({ min: 0 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidPrice'))),
            body('billingCycle')
                .optional()
                .isIn(['monthly', 'annual'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidBillingCycle'))),
        ]);
    },
};

export default planValidation;
