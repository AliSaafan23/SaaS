import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit, requireCanDelete } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminValidation from '../../utils/validations/dashboard/adminValidation.js';
import adminCountryController from '../../controllers/dashboard/adminCountryController.js';

const router = express.Router();

router.get('/public', asyncHandler(adminCountryController.publicList));

router.use(requireDashboardSession);

router.get('/', requirePermission('countries.view'), asyncHandler(adminCountryController.list));
router.get('/:id', requirePermission('countries.view'), adminValidation.validateCountryId(), asyncHandler(adminCountryController.getById));
router.post('/', requirePermission('countries.create'), requireCanEdit, adminValidation.validateCountryCreate(), asyncHandler(adminCountryController.create));
router.put('/:id', requirePermission('countries.edit'), requireCanEdit, adminValidation.validateCountryUpdate(), asyncHandler(adminCountryController.update));
router.delete('/:id', requirePermission('countries.delete'), requireCanDelete, adminValidation.validateCountryId(), asyncHandler(adminCountryController.remove));

export default router;
