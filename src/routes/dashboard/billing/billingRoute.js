import express from "express";
import { asyncHandler, requirePermission } from "../../../middleware/index.js";
import billingController from "../../../controllers/dashboard/billingController.js";
import billingValidation from "../../../utils/validations/dashboard/billingValidation.js";
import { TENANT_PERMISSIONS } from "../../../config/tenantPermissions.js";

const router = express.Router();

router.get("/invoices", asyncHandler(billingController.listInvoices));
router.post(
  "/billing/run",
  requirePermission(TENANT_PERMISSIONS.BILLING_MANAGE),
  billingValidation.validateRunBilling(),
  asyncHandler(billingController.runBilling),
);
router.post(
  "/payments",
  requirePermission(TENANT_PERMISSIONS.BILLING_MANAGE),
  billingValidation.validateCreatePayment(),
  asyncHandler(billingController.createPayment),
);
router.get("/payments", asyncHandler(billingController.listPayments));
router.post(
  "/revenue-recognition/run",
  requirePermission(TENANT_PERMISSIONS.BILLING_MANAGE),
  billingValidation.validateRunRevenue(),
  asyncHandler(billingController.runRevenueRecognition),
);
router.get(
  "/reports/income-statement",
  requirePermission(TENANT_PERMISSIONS.REPORTS_READ),
  billingValidation.validateIncomeStatement(),
  asyncHandler(billingController.incomeStatement),
);
router.get(
  "/reports/balance-sheet",
  requirePermission(TENANT_PERMISSIONS.REPORTS_READ),
  billingValidation.validateBalanceSheet(),
  asyncHandler(billingController.balanceSheet),
);

export default router;
