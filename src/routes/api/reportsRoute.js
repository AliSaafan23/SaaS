import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import reportsValidation from '../../utils/validations/api/reportsValidation.js';
import reportsController from '../../controllers/api/pos/reports/reportsController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/daily-sales',
    requireSubscription('reports.view'),
    reportsValidation.validateDailySales(),
    asyncHandler(reportsController.dailySales)
);

export default router;
