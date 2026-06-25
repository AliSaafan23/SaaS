import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import requireMerchantPage from '../../middleware/auth/requireMerchantPage.js';
import requireMerchantSubscription from '../../middleware/auth/requireMerchantSubscription.js';
import pageController from '../../controllers/merchant/pageController.js';

const router = express.Router();

router.get('/login', asyncHandler(pageController.login));
router.get('/register', asyncHandler(pageController.register));
router.get('/verify-email', asyncHandler(pageController.verifyEmail));
router.get('/forgot-password', asyncHandler(pageController.forgotPassword));
router.get('/reset-password', asyncHandler(pageController.resetPassword));

router.get('/plans', requireMerchantPage, asyncHandler(pageController.plans));
router.get('/payment-pending', requireMerchantPage, asyncHandler(pageController.paymentPending));

router.get('/home', requireMerchantPage, requireMerchantSubscription, asyncHandler(pageController.home));
router.get('/', requireMerchantPage, requireMerchantSubscription, (req, res) => res.redirect('/merchant/home'));

router.get('/ui/branches', requireMerchantPage, requireMerchantSubscription, asyncHandler(pageController.branches));
router.get('/ui/branches/:id', requireMerchantPage, requireMerchantSubscription, asyncHandler(pageController.branchDetail));
router.get('/ui/cashiers', requireMerchantPage, requireMerchantSubscription, asyncHandler(pageController.cashiers));
router.get('/ui/sale-returns', requireMerchantPage, requireMerchantSubscription, asyncHandler(pageController.saleReturns));
router.get('/ui/profile', requireMerchantPage, asyncHandler(pageController.profile));
router.get('/ui/subscription', requireMerchantPage, asyncHandler(pageController.subscription));

export default router;
