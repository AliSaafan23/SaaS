import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminDashboardController from '../../controllers/dashboard/adminDashboardController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/overview', asyncHandler(adminDashboardController.overview));
router.get('/charts', asyncHandler(adminDashboardController.charts));
router.get('/chart/:type', asyncHandler(adminDashboardController.chart));
router.get('/activities', asyncHandler(adminDashboardController.activities));

export default router;
