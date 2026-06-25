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

const licenseValidation = {
    validateActivate() {
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
            body('includeBootstrap')
                .optional({ values: 'falsy' })
                .isBoolean()
                .withMessage(() => errorRes.responseError('fail', i18n.__('validationError'))),
        ]);
    },

    validateRefresh() {
        return withMiddleware([
            deviceIdRule().optional({ values: 'falsy' }),
        ]);
    },
};

export default licenseValidation;
