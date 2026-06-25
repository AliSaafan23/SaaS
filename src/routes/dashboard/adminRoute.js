import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit, requireCanDelete } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminValidation from '../../utils/validations/dashboard/adminValidation.js';
import adminController from '../../controllers/dashboard/adminController.js';

const router = express.Router();

router.use(requireDashboardSession);

router.get('/', requirePermission('admins.view'), asyncHandler(adminController.list));
router.get('/:id', requirePermission('admins.view'), adminValidation.validateId(), asyncHandler(adminController.getById));
router.post('/', requirePermission('admins.create'), requireCanEdit, adminValidation.validateCreate(), asyncHandler(adminController.create));
router.put('/:id', requirePermission('admins.edit'), requireCanEdit, adminValidation.validateUpdate(), asyncHandler(adminController.update));
router.delete('/:id', requirePermission('admins.delete'), requireCanDelete, adminValidation.validateId(), asyncHandler(adminController.remove));

export default router;
