import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import merchantValidation from '../../utils/validations/api/merchantValidation.js';
import portalAuthController from '../../controllers/merchant/portalAuthController.js';

const router = express.Router();

router.post('/signin', merchantValidation.validateLogin(), asyncHandler(portalAuthController.signin));
router.post('/signout', requireMerchant, asyncHandler(portalAuthController.signout));

export default router;
