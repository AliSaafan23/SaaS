import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const customerValidation = {
    validateIdParam() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('name')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('customerNameRequired'))),
            body('email')
                .optional({ checkFalsy: true })
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('status')
                .optional()
                .isIn(['active', 'inactive'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidStatus'))),
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('name').optional().notEmpty().withMessage(() => errorRes.responseError('fail', i18n.__('customerNameRequired'))),
            body('email')
                .optional({ checkFalsy: true })
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('status')
                .optional()
                .isIn(['active', 'inactive'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidStatus'))),
        ]);
    },
};

export default customerValidation;
