import { body } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const deviceIdRule = () =>
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('deviceIdRequired')))
        .isLength({ min: 8, max: 100 })
        .withMessage(() => errorRes.responseError('fail', i18n.__('deviceIdRequired')));

const deviceTypeRule = () =>
    body('deviceType')
        .notEmpty()
        .withMessage(() => errorRes.responseError('fail', i18n.__('deviceTypeRequired')))
        .isIn(['ios', 'android', 'web'])
        .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDeviceType')));

const fcmTokenRule = () => body('fcmToken').optional({ values: 'falsy' }).trim();

const cashierAuthValidation = {
    validateSignup() {
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
            body('phone')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('phoneRequired'))),
            body('password')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('passwordRequired')))
                .isLength({ min: 8 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('wrongPasswordLength'))),
            body('confirmPassword')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('confirmPasswordRequired')))
                .custom((value, { req }) => {
                    if (value !== req.body.password) {
                        throw new Error(i18n.__('passwordNotMatch'));
                    }
                    return true;
                })
                .withMessage(() => errorRes.responseError('fail', i18n.__('passwordNotMatch'))),
            body('subscriptionPlanId')
                .optional({ values: 'falsy' })
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPlan'))),
            deviceIdRule(),
            deviceTypeRule(),
            fcmTokenRule(),
        ]);
    },

    validateSignin() {
        return withMiddleware([
            body('email')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('emailRequired')))
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('password')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('passwordRequired')))
                .isLength({ min: 8 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('wrongPasswordLength'))),
            deviceIdRule(),
            deviceTypeRule(),
            fcmTokenRule(),
        ]);
    },

    validateEmailOnly() {
        return withMiddleware([
            body('email')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('emailRequired')))
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
        ]);
    },

    validateVerifyEmail() {
        return withMiddleware([
            body('email')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('emailRequired')))
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('code')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('verificationCodeRequired')))
                .isLength({ min: 6, max: 6 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidVerificationCode'))),
        ]);
    },

    validateResetPassword() {
        return withMiddleware([
            body('email')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('emailRequired')))
                .isEmail()
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidEmail'))),
            body('code')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('verificationCodeRequired')))
                .isLength({ min: 6, max: 6 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidVerificationCode'))),
            body('password')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('passwordRequired')))
                .isLength({ min: 8 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('wrongPasswordLength'))),
            body('confirmPassword')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('confirmPasswordRequired')))
                .custom((value, { req }) => {
                    if (value !== req.body.password) {
                        throw new Error(i18n.__('passwordNotMatch'));
                    }
                    return true;
                })
                .withMessage(() => errorRes.responseError('fail', i18n.__('passwordNotMatch'))),
        ]);
    },
};

export default cashierAuthValidation;
