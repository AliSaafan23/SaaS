import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requirePermission, requireCanEdit } from '../../middleware/auth/requirePermission.js';
import requireDashboardSession from '../../middleware/auth/requireDashboardSession.js';
import adminSubscriberController from '../../controllers/dashboard/adminSubscriberController.js';

const router = express.Router();
router.use(requireDashboardSession);

router.get('/stats', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.stats));
router.get('/list', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.list));
router.get('/payments/pending', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.pendingPayments));
router.get('/companies', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.companyList));
router.get('/company/subscriptions', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.companySubscriptions));
router.get('/company/:companyId/detail', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.companyDetail));
router.get('/company/:companyId', requirePermission('subscribers.view'), asyncHandler(adminSubscriberController.getByCompany));
router.post('/company/:companyId/activate', requirePermission('subscribers.activate'), requireCanEdit, asyncHandler(adminSubscriberController.activateCompany));
router.patch('/company/:companyId/suspend', requirePermission('subscribers.activate'), requireCanEdit, asyncHandler(adminSubscriberController.suspendCompany));

export default router;
