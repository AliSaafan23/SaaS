import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import merchantValidation from '../../utils/validations/api/merchantValidation.js';
import authController from '../../controllers/merchant/authController.js';

const router = express.Router();

router.post('/register', merchantValidation.validateRegister(), asyncHandler(authController.register));
router.post('/verify-email', merchantValidation.validateVerifyEmail(), asyncHandler(authController.verifyEmail));
router.post('/resend-activation', merchantValidation.validateEmailOnly(), asyncHandler(authController.resendActivation));
router.post('/login', merchantValidation.validateLogin(), asyncHandler(authController.login));
router.post('/forgot-password', merchantValidation.validateEmailOnly(), asyncHandler(authController.forgotPassword));
router.post('/reset-password', merchantValidation.validateResetPassword(), asyncHandler(authController.resetPassword));
router.post('/logout', requireMerchant, asyncHandler(authController.logout));

export default router;
