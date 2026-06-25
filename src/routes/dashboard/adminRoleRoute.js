import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit, requireCanDelete } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminRoleValidation from '../../utils/validations/dashboard/adminRoleValidation.js';
import adminRoleController from '../../controllers/dashboard/adminRoleController.js';

const router = express.Router();

router.use(requireDashboardSession);

router.get('/permissions', requirePermission('roles.view'), asyncHandler(adminRoleController.listPermissions));
router.get('/', requirePermission('roles.view'), asyncHandler(adminRoleController.list));
router.get('/:id', requirePermission('roles.view'), adminRoleValidation.validateId(), asyncHandler(adminRoleController.getById));
router.post('/', requirePermission('roles.create'), requireCanEdit, adminRoleValidation.validateCreate(), asyncHandler(adminRoleController.create));
router.put('/:id', requirePermission('roles.edit'), requireCanEdit, adminRoleValidation.validateUpdate(), asyncHandler(adminRoleController.update));
router.delete('/:id', requirePermission('roles.delete'), requireCanDelete, adminRoleValidation.validateId(), asyncHandler(adminRoleController.remove));

export default router;
