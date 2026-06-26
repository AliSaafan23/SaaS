import express from 'express';
import { asyncHandler, requireDashboardSession, requireDashboardPage } from '../../middleware/index.js';
import tenantAuthController from '../../controllers/dashboard/tenantAuthController.js';
import planController from '../../controllers/dashboard/planController.js';
import customerController from '../../controllers/dashboard/customerController.js';
import subscriptionController from '../../controllers/dashboard/subscriptionController.js';
import billingController from '../../controllers/dashboard/billingController.js';
import pageController from '../../controllers/dashboard/pageController.js';

const router = express.Router();

// Pages
router.get('/login', pageController.login);
router.get('/register', pageController.register);
router.get('/home', requireDashboardPage, pageController.home);
router.get('/ui/plans', requireDashboardPage, pageController.plans);
router.get('/ui/customers', requireDashboardPage, pageController.customers);
router.get('/ui/subscriptions', requireDashboardPage, pageController.subscriptions);
router.get('/ui/invoices', requireDashboardPage, pageController.invoices);
router.get('/ui/payments', requireDashboardPage, pageController.payments);
router.get('/ui/reports', requireDashboardPage, pageController.reports);

// Auth API
router.post('/auth/register', asyncHandler(tenantAuthController.register));
router.post('/auth/signin', asyncHandler(tenantAuthController.signin));
router.post('/auth/signout', requireDashboardSession, asyncHandler(tenantAuthController.signout));
router.get('/auth/profile', requireDashboardSession, asyncHandler(tenantAuthController.profile));

// Protected APIs
router.use(requireDashboardSession);

router.get('/plans', asyncHandler(planController.list));
router.get('/plans/:id', asyncHandler(planController.getById));
router.post('/plans', asyncHandler(planController.create));
router.put('/plans/:id', asyncHandler(planController.update));
router.delete('/plans/:id', asyncHandler(planController.remove));

router.get('/customers', asyncHandler(customerController.list));
router.get('/customers/:id', asyncHandler(customerController.getById));
router.post('/customers', asyncHandler(customerController.create));
router.put('/customers/:id', asyncHandler(customerController.update));
router.delete('/customers/:id', asyncHandler(customerController.remove));

router.get('/subscriptions', asyncHandler(subscriptionController.list));
router.get('/subscriptions/:id', asyncHandler(subscriptionController.getById));
router.post('/subscriptions', asyncHandler(subscriptionController.create));
router.put('/subscriptions/:id', asyncHandler(subscriptionController.update));
router.delete('/subscriptions/:id', asyncHandler(subscriptionController.remove));

router.get('/invoices', asyncHandler(billingController.listInvoices));
router.post('/billing/run', asyncHandler(billingController.runBilling));
router.post('/payments', asyncHandler(billingController.createPayment));
router.get('/payments', asyncHandler(billingController.listPayments));
router.post('/revenue-recognition/run', asyncHandler(billingController.runRevenueRecognition));
router.get('/reports/income-statement', asyncHandler(billingController.incomeStatement));
router.get('/reports/balance-sheet', asyncHandler(billingController.balanceSheet));

export default router;
