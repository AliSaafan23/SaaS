import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminAuthValidation from '../../utils/validations/dashboard/adminAuthValidation.js';
import adminAuthController from '../../controllers/dashboard/adminAuthController.js';

const router = express.Router();

router.post('/signin', adminAuthValidation.validateSignin(), asyncHandler(adminAuthController.signin));
router.post('/logout', requireDashboardSession, asyncHandler(adminAuthController.logout));
router.get('/profile', requireDashboardSession, asyncHandler(adminAuthController.profile));

export default router;
