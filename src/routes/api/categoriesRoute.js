import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import inventoryValidation from '../../utils/validations/api/inventoryValidation.js';
import categoryController from '../../controllers/api/pos/inventory/categoryController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/',
    requireSubscription('inventory.view'),
    asyncHandler(categoryController.list)
);
router.post(
    '/',
    requireSubscription('inventory.create'),
    inventoryValidation.validateCreateCategory(),
    asyncHandler(categoryController.create)
);
router.delete(
    '/:id',
    requireSubscription('inventory.create'),
    inventoryValidation.validateCategoryId(),
    asyncHandler(categoryController.remove)
);

export default router;
