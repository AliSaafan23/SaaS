import express from 'express';
import pageRoutes from './pageRoute.js';
import adminAuthRoutes from './adminAuthRoute.js';
import adminDashboardRoutes from './adminDashboardRoute.js';
import adminSubscriptionRoutes from './adminSubscriptionRoute.js';
import adminRoleRoutes from './adminRoleRoute.js';
import adminRoutes from './adminRoute.js';
import adminSupportRoutes from './adminSupportRoute.js';
import adminAuditRoutes from './adminAuditRoute.js';
import adminNotificationRoutes from './adminNotificationRoute.js';
import adminSubscriberRoutes from './adminSubscriberRoute.js';
import adminCountryRoutes from './adminCountryRoute.js';
import adminAppInstallRoutes from './adminAppInstallRoute.js';
import adminSettingsRoutes from './adminSettingsRoute.js';
import adminPaymentMethodRoutes from './adminPaymentMethodRoute.js';

const router = express.Router();

router.use(pageRoutes);
router.use('/auth', adminAuthRoutes);
router.use('/stats', adminDashboardRoutes);
router.use('/subscriptions', adminSubscriptionRoutes);
router.use('/roles', adminRoleRoutes);
router.use('/admins', adminRoutes);
router.use('/support', adminSupportRoutes);
router.use('/audit-logs', adminAuditRoutes);
router.use('/notifications', adminNotificationRoutes);
router.use('/subscribers', adminSubscriberRoutes);
router.use('/countries', adminCountryRoutes);
router.use('/app-installs', adminAppInstallRoutes);
router.use('/settings', adminSettingsRoutes);
router.use('/payment-methods', adminPaymentMethodRoutes);

export default router;
