import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import merchantValidation from '../../utils/validations/api/merchantValidation.js';
import cashierController from '../../controllers/merchant/cashierController.js';

const router = express.Router();

router.get('/cashiers', requireMerchant, asyncHandler(cashierController.listCashiers));
router.post('/cashiers', requireMerchant, merchantValidation.validateCreateCashier(), asyncHandler(cashierController.createCashier));
router.put('/cashiers/:id', requireMerchant, merchantValidation.validateUpdateCashier(), asyncHandler(cashierController.updateCashier));
router.delete('/cashiers/:id', requireMerchant, asyncHandler(cashierController.deleteCashier));

export default router;
