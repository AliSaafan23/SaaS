import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import { moduleStatus } from '../../controllers/api/pos/moduleStatusController.js';

/**
 * Skeleton router for a cashier POS module (Step 0 infrastructure).
 */
export const createPosModuleRouter = (moduleName, viewFeatureKey) => {
    const router = express.Router();
    router.use(...cashierPosStack);
    router.get(
        '/',
        requireSubscription(viewFeatureKey),
        asyncHandler(moduleStatus(moduleName))
    );
    return router;
};

export default createPosModuleRouter;
