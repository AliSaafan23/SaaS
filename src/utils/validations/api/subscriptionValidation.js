import { body } from 'express-validator';
import { ApiError, showErrorsApi } from '../../index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');
const withMiddleware = (validations) => [...validations, showErrorsApi];

const subscriptionValidation = {
    validateRequest() {
        return withMiddleware([
            body('subscriptionPlanId')
                .notEmpty()
                .withMessage(() => errorRes.responseError('fail', i18n.__('planRequired')))
                .isInt({ min: 1 })
                .withMessage(() => errorRes.responseError('fail', i18n.__('invalidPlan'))),
        ]);
    },
};

export default subscriptionValidation;
