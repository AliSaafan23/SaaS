import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit, requireCanDelete } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminValidation from '../../utils/validations/dashboard/adminValidation.js';
import adminPaymentMethodController from '../../controllers/dashboard/adminPaymentMethodController.js';

const router = express.Router();

router.use(requireDashboardSession);

router.get('/', requirePermission('settings.view'), asyncHandler(adminPaymentMethodController.list));
router.get(
    '/:id',
    requirePermission('settings.view'),
    adminValidation.validatePaymentMethodId(),
    asyncHandler(adminPaymentMethodController.getById)
);
router.post(
    '/',
    requirePermission('settings.edit'),
    requireCanEdit,
    adminValidation.validatePaymentMethodCreate(),
    asyncHandler(adminPaymentMethodController.create)
);
router.put(
    '/:id',
    requirePermission('settings.edit'),
    requireCanEdit,
    adminValidation.validatePaymentMethodUpdate(),
    asyncHandler(adminPaymentMethodController.update)
);
router.delete(
    '/:id',
    requirePermission('settings.edit'),
    requireCanDelete,
    adminValidation.validatePaymentMethodId(),
    asyncHandler(adminPaymentMethodController.remove)
);

export default router;
