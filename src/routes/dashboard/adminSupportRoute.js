import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminSupportController from '../../controllers/dashboard/adminSupportController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/', requirePermission('support.view'), asyncHandler(adminSupportController.list));
router.patch('/:id', requirePermission('support.edit'), requireCanEdit, asyncHandler(adminSupportController.updateStatus));

export default router;
