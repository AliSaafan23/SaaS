import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminAppInstallController from '../../controllers/dashboard/adminAppInstallController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/stats', requirePermission('appInstalls.view'), asyncHandler(adminAppInstallController.stats));
router.get('/', requirePermission('appInstalls.view'), asyncHandler(adminAppInstallController.list));

export default router;
