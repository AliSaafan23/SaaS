import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';
import { getAllPermissionKeys } from '../../../config/permissions.js';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];
const validKeys = getAllPermissionKeys();

const adminRoleValidation = {
    validateId() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('name.ar')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('roleNameRequired'))),
            body('name.en').optional().trim(),
            body('description.ar').optional().trim(),
            body('description.en').optional().trim(),
            body('permissions')
                .isArray({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('permissionsRequired'))),
            body('permissions.*')
                .custom((val) => val === 'all' || validKeys.includes(val))
                .withMessage(() => errorRes.responseError('fail', i18n.__('noPermission'))),
            body('color').optional().trim(),
            body('isActive').optional().isBoolean(),
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
            body('name.ar').optional().trim().notEmpty(),
            body('name.en').optional().trim(),
            body('description.ar').optional().trim(),
            body('description.en').optional().trim(),
            body('permissions')
                .optional()
                .isArray({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('permissionsRequired'))),
            body('permissions.*')
                .optional()
                .custom((val) => val === 'all' || validKeys.includes(val)),
            body('color').optional().trim(),
            body('isActive').optional().isBoolean(),
        ]);
    },
};

export default adminRoleValidation;
