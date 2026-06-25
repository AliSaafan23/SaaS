import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const emailRule = () =>
    body('email')
        .trim()
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('emailRequired')))
        .isEmail()
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail')));

const codeRule = () =>
    body('code')
        .trim()
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('verificationCodeRequired')))
        .isLength({ min: 6, max: 6 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidVerificationCode')));

const passwordRule = () =>
    body('password')
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('passwordRequired')))
        .isLength({ min: 8 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('wrongPasswordLength')));

const confirmPasswordRule = () =>
    body('confirmPassword')
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('confirmPasswordRequired')))
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error(i18n.__('passwordNotMatch'));
            }
            return true;
        })
        .withMessage(() => errorRes.responseError('fail', i18n.__('passwordNotMatch')));

const merchantValidation = {
    validateRegister() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            emailRule(),
            passwordRule(),
            body('phone')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('phoneRequired'))),
            body('companyName')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('companyNameRequired'))),
            body('companyPhone')
                .optional({ values: 'falsy' })
                .trim(),
            body('companyAddress')
                .optional({ values: 'falsy' })
                .trim(),
            body('countryId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('countryRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidCountry'))),
        ]);
    },

    validateVerifyEmail() {
        return withMiddleware([
            emailRule(),
            codeRule(),
        ]);
    },

    validateEmailOnly() {
        return withMiddleware([
            emailRule(),
        ]);
    },

    validateLogin() {
        return withMiddleware([
            emailRule(),
            passwordRule(),
        ]);
    },

    validateResetPassword() {
        return withMiddleware([
            emailRule(),
            codeRule(),
            passwordRule(),
            confirmPasswordRule(),
        ]);
    },

    validateSubscribe() {
        return withMiddleware([
            body('subscriptionPlanId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('planRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPlan'))),
        ]);
    },

    validateCreateBranch() {
        return withMiddleware([
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('branchNameRequired'))),
            body('address')
                .optional({ values: 'falsy' })
                .trim(),
            body('phone')
                .optional({ values: 'falsy' })
                .trim(),
        ]);
    },

    validateCreateCashier() {
        return withMiddleware([
            body('branchId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('branchIdRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidBranchId'))),
            body('name')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('nameRequired'))),
            emailRule(),
            passwordRule(),
            body('phone')
                .optional({ values: 'falsy' })
                .trim(),
        ]);
    },

    validateUpdateCashier() {
        return withMiddleware([
            param('id')
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidIdFormat'))),
            body('name').optional().trim().notEmpty(),
            body('phone').optional({ values: 'falsy' }).trim(),
            body('branchId').optional().isInt({ min: 1 }),
            body('status').optional().isIn(['active', 'block']),
        ]);
    },
};

export default merchantValidation;
