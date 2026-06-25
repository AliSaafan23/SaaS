import express from 'express';

import cashierAuthRoutes from './cashierAuthRoute.js';
import productsRoutes from './productsRoute.js';
import categoriesRoutes from './categoriesRoute.js';
import unitsRoutes from './unitsRoute.js';
import stockRoutes from './stockRoute.js';
import customersRoutes from './customersRoute.js';
import suppliersRoutes from './suppliersRoute.js';
import salesRoutes from './salesRoute.js';
import saleReturnsRoutes from './saleReturnsRoute.js';
import paymentMethodsRoutes from './paymentMethodsRoute.js';
import purchasesRoutes from './purchasesRoute.js';
import cashboxRoutes from './cashboxRoute.js';
import expensesRoutes from './expensesRoute.js';
import reportsRoutes from './reportsRoute.js';
import appInstallRoutes from './appInstallRoute.js';
import licenseRoutes from './licenseRoute.js';

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Gold Pos API is healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

router.use('/auth', cashierAuthRoutes);
router.use('/license', licenseRoutes);

router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/units', unitsRoutes);
router.use('/stock', stockRoutes);
router.use('/customers', customersRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/sales', salesRoutes);
router.use('/sale-returns', saleReturnsRoutes);
router.use('/payment-methods', paymentMethodsRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/cashbox', cashboxRoutes);
router.use('/expenses', expensesRoutes);
router.use('/reports', reportsRoutes);
router.use('/app', appInstallRoutes);

export default router;
