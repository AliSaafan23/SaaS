import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import inventoryValidation from '../../utils/validations/api/inventoryValidation.js';
import unitController from '../../controllers/api/pos/inventory/unitController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/',
    requireSubscription('inventory.view'),
    asyncHandler(unitController.list)
);
router.post(
    '/',
    requireSubscription('inventory.create'),
    inventoryValidation.validateCreateUnit(),
    asyncHandler(unitController.create)
);

export default router;
