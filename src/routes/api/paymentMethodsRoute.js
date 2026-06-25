import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import paymentMethodController from '../../controllers/api/pos/paymentMethods/paymentMethodController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/',
    requireSubscription('sales.view'),
    asyncHandler(paymentMethodController.list)
);

export default router;
