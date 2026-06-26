import express from "express";
import { asyncHandler, requirePermission } from "../../../middleware/index.js";
import planController from "../../../controllers/dashboard/planController.js";
import planValidation from "../../../utils/validations/dashboard/planValidation.js";
import { TENANT_PERMISSIONS } from "../../../config/tenantPermissions.js";

const router = express.Router();

router.get("/", asyncHandler(planController.list));
router.get(
  "/:id",
  planValidation.validateIdParam(),
  asyncHandler(planController.getById),
);
router.post(
  "/",
  requirePermission(TENANT_PERMISSIONS.PLANS_MANAGE),
  planValidation.validateCreate(),
  asyncHandler(planController.create),
);
router.put(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.PLANS_MANAGE),
  planValidation.validateUpdate(),
  asyncHandler(planController.update),
);
router.delete(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.PLANS_MANAGE),
  planValidation.validateIdParam(),
  asyncHandler(planController.remove),
);

export default router;
