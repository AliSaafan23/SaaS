import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminAuditController from '../../controllers/dashboard/adminAuditController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/', requirePermission('audit.view'), asyncHandler(adminAuditController.list));

export default router;
