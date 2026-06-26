import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const tenantRoleValidation = {
    validateId() {
        return withMiddleware([
            param('id').isInt().withMessage(() => errorRes.responseError('fail', i18n.__('invalidId')))
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('name').notEmpty().withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            body('permissions').isArray().withMessage(() => errorRes.responseError('fail', i18n.__('invalidPermissions')))
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt().withMessage(() => errorRes.responseError('fail', i18n.__('invalidId'))),
            body('name').optional().notEmpty().withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            body('permissions').optional().isArray().withMessage(() => errorRes.responseError('fail', i18n.__('invalidPermissions')))
        ]);
    }
};

export default tenantRoleValidation;
