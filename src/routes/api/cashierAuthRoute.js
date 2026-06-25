import express from 'express';
import { asyncHandler, requireAuth } from '../../middleware/index.js';
import cashierAuthValidation from '../../utils/validations/api/cashierAuthValidation.js';
import cashierAuthController from '../../controllers/api/cashierAuthController.js';

const router = express.Router();

/** @deprecated Cashiers are created by the merchant — kept for backward-compatible app versions */
router.post('/signup', cashierAuthController.signupDisabled);

router.post('/signin', cashierAuthValidation.validateSignin(), asyncHandler(cashierAuthController.signin));

router.post('/verify-email', cashierAuthValidation.validateVerifyEmail(), asyncHandler(cashierAuthController.verifyEmail));
router.post('/resend-activation', cashierAuthValidation.validateEmailOnly(), asyncHandler(cashierAuthController.resendActivation));

router.post('/forgot-password', cashierAuthValidation.validateEmailOnly(), asyncHandler(cashierAuthController.forgotPassword));
router.post('/reset-password', cashierAuthValidation.validateResetPassword(), asyncHandler(cashierAuthController.resetPassword));

router.get('/profile', requireAuth, asyncHandler(cashierAuthController.profile));
router.post('/logout', requireAuth, asyncHandler(cashierAuthController.logout));

export default router;
