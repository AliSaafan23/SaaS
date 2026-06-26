import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const tenantUserValidation = {
    validateId() {
        return withMiddleware([
            param('id').isInt().withMessage(() => errorRes.responseError('fail', i18n.__('invalidId')))
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('name').notEmpty().withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            body('email').isEmail().withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('password').isLength({ min: 8 }).withMessage(() => errorRes.responseError('fail', i18n.__('passwordTooShort'))),
            body('roleId').optional().isInt().withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('status').optional().isIn(['active', 'block']).withMessage(() => errorRes.responseError('fail', i18n.__('invalidStatus')))
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt().withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('name').optional().notEmpty().withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            body('email').optional().isEmail().withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('password').optional().isLength({ min: 8 }).withMessage(() => errorRes.responseError('fail', i18n.__('passwordTooShort'))),
            body('roleId').optional().isInt().withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('status').optional().isIn(['active', 'block']).withMessage(() => errorRes.responseError('fail', i18n.__('invalidStatus')))
        ]);
    }
};

export default tenantUserValidation;
