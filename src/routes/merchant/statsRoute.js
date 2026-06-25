import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireMerchant } from '../../middleware/auth/requireMerchant.js';
import requireMerchantSubscription from '../../middleware/auth/requireMerchantSubscription.js';
import statsController from '../../controllers/merchant/statsController.js';

const router = express.Router();

router.use(requireMerchant, requireMerchantSubscription);

router.get('/overview', asyncHandler(statsController.overview));
router.get('/chart/:type', asyncHandler(statsController.chart));
router.get('/branches/summary', asyncHandler(statsController.branchesSummary));
router.get('/branches/summary/export', asyncHandler(statsController.exportBranchesSummary));
router.get('/low-stock', asyncHandler(statsController.lowStock));
router.get('/sale-returns', asyncHandler(statsController.saleReturns));
router.get('/branches/:id/overview', asyncHandler(statsController.branchOverview));
router.get('/branches/:id/stock', asyncHandler(statsController.branchStock));
router.get('/branches/:id/customers', asyncHandler(statsController.branchCustomers));
router.get('/branches/:id/suppliers', asyncHandler(statsController.branchSuppliers));

export default router;
