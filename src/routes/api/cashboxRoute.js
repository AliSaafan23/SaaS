import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import cashboxValidation from '../../utils/validations/api/cashboxValidation.js';
import cashboxController from '../../controllers/api/pos/cashbox/cashboxController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/shift-summary',
    requireSubscription('cashbox.view'),
    cashboxValidation.validateShiftSummary(),
    asyncHandler(cashboxController.shiftSummary)
);

router.get(
    '/shift/active',
    requireSubscription('cashbox.view'),
    asyncHandler(cashboxController.activeShift)
);

router.post(
    '/shift/open',
    requireSubscription('cashbox.deposit'),
    cashboxValidation.validateOpenShift(),
    asyncHandler(cashboxController.openShift)
);

router.post(
    '/shift/close',
    requireSubscription('cashbox.deposit'),
    cashboxValidation.validateCloseShift(),
    asyncHandler(cashboxController.closeShift)
);

export default router;
