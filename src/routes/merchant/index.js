import express from 'express';
import pageRoutes from './pageRoute.js';
import portalAuthRoutes from './portalAuthRoute.js';
import authRoutes from './authRoute.js';
import companyRoutes from './companyRoute.js';
import subscriptionRoutes from './subscriptionRoute.js';
import branchRoutes from './branchRoute.js';
import cashierRoutes from './cashierRoute.js';
import statsRoutes from './statsRoute.js';
import countryRoutes from './countryRoute.js';

const router = express.Router();

router.use(pageRoutes);
router.use('/auth', portalAuthRoutes);
router.use('/auth', authRoutes);
router.use('/countries', countryRoutes);
router.use('/company', companyRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/branch', branchRoutes);
router.use('/cashier', cashierRoutes);
router.use('/stats', statsRoutes);

export default router;
