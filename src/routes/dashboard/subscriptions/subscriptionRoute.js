import express from "express";
import { asyncHandler, requirePermission } from "../../../middleware/index.js";
import subscriptionController from "../../../controllers/dashboard/subscriptionController.js";
import subscriptionValidation from "../../../utils/validations/dashboard/subscriptionValidation.js";
import { TENANT_PERMISSIONS } from "../../../config/tenantPermissions.js";

const router = express.Router();

router.get("/", requirePermission(TENANT_PERMISSIONS.SUBSCRIPTIONS_READ), asyncHandler(subscriptionController.list));
router.get(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.SUBSCRIPTIONS_READ),
  subscriptionValidation.validateIdParam(),
  asyncHandler(subscriptionController.getById),
);
router.post(
  "/",
  requirePermission(TENANT_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  subscriptionValidation.validateCreate(),
  asyncHandler(subscriptionController.create),
);
router.put(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  subscriptionValidation.validateUpdate(),
  asyncHandler(subscriptionController.update),
);
router.delete(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  subscriptionValidation.validateIdParam(),
  asyncHandler(subscriptionController.remove),
);

export default router;
