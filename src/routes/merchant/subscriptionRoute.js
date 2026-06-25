import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import merchantValidation from '../../utils/validations/api/merchantValidation.js';
import subscriptionController from '../../controllers/merchant/subscriptionController.js';

const router = express.Router();

router.get('/plans', asyncHandler(subscriptionController.getPlans));
router.post('/subscribe', requireMerchant, merchantValidation.validateSubscribe(), asyncHandler(subscriptionController.subscribe));
router.get('/status', requireMerchant, asyncHandler(subscriptionController.subscriptionStatus));
router.get('/pending-payment', requireMerchant, asyncHandler(subscriptionController.getPendingPayment));
router.post('/payment-receipt', requireMerchant, asyncHandler(subscriptionController.uploadPaymentReceipt));
router.post('/paymob/webhook', asyncHandler(subscriptionController.paymobWebhook));

export default router;
