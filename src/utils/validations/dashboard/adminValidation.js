import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const adminValidation = {
    validateId() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
        ]);
    },

    validateCreate() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            body('email')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('emailRequired')))
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('phone').optional().trim(),
            body('password')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('passwordRequired')))
                .isLength({ min: 8 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('wrongPasswordLength'))),
            body('role_id')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('roleIdRequired'))),
            body('language').optional().isIn(['ar', 'en']),
            body('theme').optional().isIn(['light', 'dark']),
            body('isAdmin').optional().isBoolean(),
            body('canEdit').optional().isBoolean(),
            body('canDelete').optional().isBoolean(),
        ]);
    },

    validateUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
            body('name').optional().trim().notEmpty(),
            body('email').optional().trim().isEmail(),
            body('phone').optional().trim(),
            body('password')
                .optional()
                .isLength({ min: 8 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('wrongPasswordLength'))),
            body('role_id').optional(),
            body('language').optional().isIn(['ar', 'en']),
            body('theme').optional().isIn(['light', 'dark']),
            body('status').optional().isIn(['active', 'block']),
            body('isAdmin').optional().isBoolean(),
            body('canEdit').optional().isBoolean(),
            body('canDelete').optional().isBoolean(),
        ]);
    },

    validatePlanId() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
        ]);
    },

    validatePlanCreate() {
        return withMiddleware([
            body('name.ar').trim().notEmpty().withMessage(() =>
                errorRes.responseError('fail', i18n.__('nameRequired'))
            ),
            body('platform').optional().isIn(['desktop', 'mobile', 'android']),
            body('billingCycle').optional().isIn(['monthly', 'annual', 'lifetime']),
            body('price').isFloat({ min: 0 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidPrice'))
            ),
            body('durationDays').optional().isInt({ min: 1 }),
            body('maxProducts').optional().isInt({ min: 1 }),
            body('maxDevices').optional().isInt({ min: 1 }),
            body('maxBranches').optional().isInt({ min: 1 }),
            body('storageLimitMb').optional().isInt({ min: 1 }),
            body('features').optional().isArray(),
            body('isActive').optional().isBoolean(),
        ]);
    },

    validatePlanUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
            body('name.ar').optional().trim().notEmpty(),
            body('platform').optional().isIn(['desktop', 'mobile', 'android']),
            body('billingCycle').optional().isIn(['monthly', 'annual', 'lifetime']),
            body('price').optional().isFloat({ min: 0 }),
            body('durationDays').optional().isInt({ min: 1 }),
            body('maxProducts').optional().isInt({ min: 1 }),
            body('maxDevices').optional().isInt({ min: 1 }),
            body('maxBranches').optional().isInt({ min: 1 }),
            body('storageLimitMb').optional().isInt({ min: 1 }),
            body('features').optional().isArray(),
            body('isActive').optional().isBoolean(),
        ]);
    },

    validateCountryId() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
        ]);
    },

    validateCountryCreate() {
        return withMiddleware([
            body('nameAr')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            body('nameEn').optional().trim(),
            body('code')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('countryCodeRequired')))
                .isLength({ min: 2, max: 5 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('countryCodeInvalid'))),
            body('phoneCode').optional().trim(),
            body('sortOrder').optional().isInt({ min: 0 }),
            body('isActive').optional().isBoolean(),
        ]);
    },

    validateCountryUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
            body('nameAr').optional().trim().notEmpty(),
            body('nameEn').optional().trim(),
            body('code')
                .optional()
                .trim()
                .isLength({ min: 2, max: 5 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('countryCodeInvalid'))),
            body('phoneCode').optional().trim(),
            body('sortOrder').optional().isInt({ min: 0 }),
            body('isActive').optional().isBoolean(),
        ]);
    },

    validatePaymentMethodId() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
        ]);
    },

    validatePaymentMethodCreate() {
        return withMiddleware([
            body('nameAr')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('paymentMethodNameRequired'))),
            body('nameEn')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('paymentMethodNameRequired'))),
            body('code')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('paymentMethodCodeRequired')))
                .isLength({ min: 2, max: 30 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('paymentMethodCodeInvalid'))),
            body('sortOrder').optional().isInt({ min: 0 }),
            body('affectsCashbox').optional().isBoolean(),
            body('requiresCustomer').optional().isBoolean(),
            body('isActive').optional().isBoolean(),
        ]);
    },

    validatePaymentMethodUpdate() {
        return withMiddleware([
            param('id').isInt({ min: 1 }).withMessage(() =>
                errorRes.responseError('fail', i18n.__('invalidIdFormat'))
            ),
            body('nameAr').optional().trim().notEmpty(),
            body('nameEn').optional().trim().notEmpty(),
            body('code')
                .optional()
                .trim()
                .isLength({ min: 2, max: 30 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('paymentMethodCodeInvalid'))),
            body('sortOrder').optional().isInt({ min: 0 }),
            body('affectsCashbox').optional().isBoolean(),
            body('requiresCustomer').optional().isBoolean(),
            body('isActive').optional().isBoolean(),
        ]);
    },
};

export default adminValidation;
