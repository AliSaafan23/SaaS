import { body } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const appInstallValidation = {
    validateTrack() {
        return withMiddleware([
            body('deviceId')
                .trim()
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('deviceIdRequired')))
                .isLength({ min: 8, max: 100 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('deviceIdRequired'))),
            body('deviceType')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('deviceTypeRequired')))
                .isIn(['ios', 'android', 'web'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidDeviceType'))),
            body('countryId').optional({ values: 'falsy' }).isInt({ min: 1 }),
            body('countryCode')
                .optional({ values: 'falsy' })
                .trim()
                .isLength({ min: 2, max: 5 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('countryCodeInvalid'))),
            body('platform').optional().isIn(['desktop', 'mobile']),
            body('appVersion').optional().trim().isLength({ max: 30 }),
            body('deviceModel').optional().trim().isLength({ max: 120 }),
            body('osVersion').optional().trim().isLength({ max: 60 }),
        ]);
    },
};

export default appInstallValidation;
