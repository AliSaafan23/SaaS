import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import { normalizeSaleReturnBody } from '../../middleware/api/normalizeSaleReturnBody.js';
import saleReturnValidation from '../../utils/validations/api/saleReturnValidation.js';
import saleReturnController from '../../controllers/api/pos/sales/saleReturnController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/meta',
    requireSubscription('sales.return'),
    asyncHandler(saleReturnController.meta)
);

router.get(
    '/',
    requireSubscription('sales.return'),
    saleReturnValidation.validateList(),
    asyncHandler(saleReturnController.list)
);

router.post(
    '/calculate',
    normalizeSaleReturnBody,
    requireSubscription('sales.return'),
    saleReturnValidation.validateCalculate(),
    asyncHandler(saleReturnController.calculate)
);

router.post(
    '/',
    normalizeSaleReturnBody,
    requireSubscription('sales.return'),
    saleReturnValidation.validateCreate(),
    asyncHandler(saleReturnController.create)
);

router.get(
    '/:id/pdf',
    requireSubscription('sales.return'),
    saleReturnValidation.validateReturnPdf(),
    asyncHandler(saleReturnController.returnPdf)
);

router.get(
    '/:id',
    requireSubscription('sales.return'),
    saleReturnValidation.validateReturnId(),
    asyncHandler(saleReturnController.getById)
);

export default router;
