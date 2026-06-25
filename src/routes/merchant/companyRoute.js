import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import companyController from '../../controllers/merchant/companyController.js';

const router = express.Router();

router.get('/profile', requireMerchant, asyncHandler(companyController.profile));

export default router;
