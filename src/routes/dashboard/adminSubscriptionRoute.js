import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit, requireCanDelete } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminValidation from '../../utils/validations/dashboard/adminValidation.js';
import adminSubscriptionPlanController from '../../controllers/dashboard/adminSubscriptionPlanController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/features/catalog', requirePermission('subscriptions.view'), asyncHandler(adminSubscriptionPlanController.featuresCatalog));
router.get('/', requirePermission('subscriptions.view'), asyncHandler(adminSubscriptionPlanController.list));
router.get('/:id', requirePermission('subscriptions.view'), adminValidation.validatePlanId(), asyncHandler(adminSubscriptionPlanController.getById));
router.post('/', requirePermission('subscriptions.create'), requireCanEdit, adminValidation.validatePlanCreate(), asyncHandler(adminSubscriptionPlanController.create));
router.put('/:id', requirePermission('subscriptions.edit'), requireCanEdit, adminValidation.validatePlanUpdate(), asyncHandler(adminSubscriptionPlanController.update));
router.delete('/:id', requirePermission('subscriptions.delete'), requireCanDelete, adminValidation.validatePlanId(), asyncHandler(adminSubscriptionPlanController.remove));

export default router;
