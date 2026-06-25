import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import merchantValidation from '../../utils/validations/api/merchantValidation.js';
import branchController from '../../controllers/merchant/branchController.js';

const router = express.Router();

router.get('/branches', requireMerchant, asyncHandler(branchController.listBranches));
router.post('/branches', requireMerchant, merchantValidation.validateCreateBranch(), asyncHandler(branchController.createBranch));
router.put('/branches/:id', requireMerchant, asyncHandler(branchController.updateBranch));
router.delete('/branches/:id', requireMerchant, asyncHandler(branchController.deleteBranch));

export default router;
