import { hasPermission } from "../../helpers/dashboard/tenantPermissions.js";
import { errorHandler } from "../../helpers/index.js";

const requirePermission = (permission) => (req, res, next) => {
  if (hasPermission(req.tenantUser, permission)) return next();
  return errorHandler(res, "forbidden", "forbidden");
};

export default requirePermission;
