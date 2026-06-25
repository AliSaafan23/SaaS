import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminSettingsController from '../../controllers/dashboard/adminSettingsController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/', requirePermission('settings.view'), asyncHandler(adminSettingsController.getAll));
router.put('/', requirePermission('settings.edit'), requireCanEdit, asyncHandler(adminSettingsController.save));

export default router;
