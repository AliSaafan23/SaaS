import { body, param } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const adminAuthValidation = {
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
        ]);
    },
};

export default adminAuthValidation;
