import { query } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError("", "");

const withMiddleware = (validations) => {
    return [...validations, showErrorsApi];
};

const policyValidation = {
    validateGetPolicy() {
        return withMiddleware([
            query('type')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('policyTypeRequired')))
                .isIn(['privacy', 'terms', 'about'])
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPolicyType')))
        ]);
    },
};

// Default export
export default policyValidation;
