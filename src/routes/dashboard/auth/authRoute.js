import express from "express";
import { asyncHandler, requireDashboardSession } from "../../../middleware/index.js";
import tenantAuthController from "../../../controllers/dashboard/tenantAuthController.js";
import tenantAuthValidation from "../../../utils/validations/dashboard/tenantAuthValidation.js";

const router = express.Router();

router.post(
  "/register",
  tenantAuthValidation.validateRegister(),
  asyncHandler(tenantAuthController.register),
);
router.post(
  "/signin",
  tenantAuthValidation.validateSignin(),
  asyncHandler(tenantAuthController.signin),
);
router.post(
  "/verify-email",
  tenantAuthValidation.validateVerifyEmail(),
  asyncHandler(tenantAuthController.verifyEmail),
);
router.post(
  "/resend-code",
  tenantAuthValidation.validateResendCode(),
  asyncHandler(tenantAuthController.resendCode),
);
router.post(
  "/signout",
  requireDashboardSession,
  asyncHandler(tenantAuthController.signout),
);
router.get(
  "/profile",
  requireDashboardSession,
  asyncHandler(tenantAuthController.profile),
);

export default router;
