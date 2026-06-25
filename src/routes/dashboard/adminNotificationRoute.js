import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminNotificationController from '../../controllers/dashboard/adminNotificationController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/', requirePermission('notifications.view'), asyncHandler(adminNotificationController.list));
router.post('/', requirePermission('notifications.create'), requireCanEdit, asyncHandler(adminNotificationController.create));

export default router;
