import { body } from "express-validator";
import { ApiError, showErrorsApi } from "../../../utils/index.js";
import i18n from "i18n";

const errorRes = new ApiError("", "");

const withMiddleware = (validations) => {
  return [...validations, showErrorsApi];
};

const tenantAuthValidation = {
  validateRegister() {
    return withMiddleware([
      body("companyName")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("companyNameRequired")),
        ),
      body("adminName")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("adminNameRequired")),
        ),
      body("email")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("emailRequired")),
        )
        .isEmail()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("invalidEmail")),
        ),
      body("companyEmail")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("invalidEmail")),
        ),
      body("password")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("passwordRequired")),
        )
        .isLength({ min: 8 })
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("passwordTooShort")),
        ),
    ]);
  },

  validateSignin() {
    return withMiddleware([
      body("email")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("emailRequired")),
        )
        .isEmail()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("invalidEmail")),
        ),
      body("password")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("passwordRequired")),
        ),
    ]);
  },

  validateVerifyEmail() {
    return withMiddleware([
      body("email")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("emailRequired")),
        )
        .isEmail()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("invalidEmail")),
        ),
      body("code")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("activationCodeRequired")),
        )
        .isLength({ min: 6, max: 6 })
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("invalidActivationCode")),
        ),
    ]);
  },

  validateResendCode() {
    return withMiddleware([
      body("email")
        .notEmpty()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("emailRequired")),
        )
        .isEmail()
        .withMessage(() =>
          errorRes.responseError("fail", i18n.__("invalidEmail")),
        ),
    ]);
  },
};

export default tenantAuthValidation;
