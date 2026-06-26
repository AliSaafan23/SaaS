import express from "express";
import { asyncHandler, requirePermission } from "../../../middleware/index.js";
import customerController from "../../../controllers/dashboard/customerController.js";
import customerValidation from "../../../utils/validations/dashboard/customerValidation.js";
import { TENANT_PERMISSIONS } from "../../../config/tenantPermissions.js";

const router = express.Router();

router.get("/", asyncHandler(customerController.list));
router.get(
  "/:id",
  customerValidation.validateIdParam(),
  asyncHandler(customerController.getById),
);
router.post(
  "/",
  requirePermission(TENANT_PERMISSIONS.CUSTOMERS_MANAGE),
  customerValidation.validateCreate(),
  asyncHandler(customerController.create),
);
router.put(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.CUSTOMERS_MANAGE),
  customerValidation.validateUpdate(),
  asyncHandler(customerController.update),
);
router.delete(
  "/:id",
  requirePermission(TENANT_PERMISSIONS.CUSTOMERS_MANAGE),
  customerValidation.validateIdParam(),
  asyncHandler(customerController.remove),
);

export default router;
