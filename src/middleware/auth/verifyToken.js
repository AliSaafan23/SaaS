import path from "path";
import jwt from "jsonwebtoken";
import { Admin, Role } from '../../models/index.js';
import { fileURLToPath } from "url";
import { dirname } from "path";
import { errorHandler } from "../../helpers/index.js";

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Sanitize URL for permission matching
 * Removes /dashboard prefix and replaces MongoDB ObjectIds with :id
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL
 */
const sanitizeUrl = (url) => {
  // Remove query params
  const pathOnly = url.split("?")[0];

  // Remove /dashboard prefix
  let cleanPath = pathOnly.replace("/dashboard", "") || "/";

  // Replace MongoDB ObjectIds with :id
  const sanitizedUrl = cleanPath
    .split("/")
    .map((segment) =>
      segment.length === 24 && /^[a-f0-9]{24}$/i.test(segment) ? ":id" : segment
    )
    .join("/");

  return sanitizedUrl;
};

/**
 * Check if the requested URL matches any of the admin's permissions
 * @param {string} requestedUrl - The sanitized requested URL
 * @param {Array} permissions - Array of permission strings
 * @returns {boolean}
 */
const checkPermission = (requestedUrl, permissions, method = "GET") => {
  if (!permissions || permissions.length === 0) return false;

  // Check for 'all' permission
  if (permissions.includes("all")) return true;

  // 🔹 Normalize sub-resource paths for permission matching
  // This allows /vehicles/types and /cities/countries to use base resource permissions
  let normalizedUrl = requestedUrl;
  if (requestedUrl.startsWith("/vehicles/types")) {
    normalizedUrl =
      requestedUrl.replace("/vehicles/types", "/vehicles") || "/vehicles";
  } else if (requestedUrl.startsWith("/cities/countries")) {
    normalizedUrl =
      requestedUrl.replace("/cities/countries", "/cities") || "/cities";
  }

  const upperMethod = method.toUpperCase();
  const isReadMethod = ["GET", "HEAD", "OPTIONS"].includes(upperMethod);

  // ⚔️ Immediate Check: If the requested permission key provided by the route
  // explicitly defines an action (ends with /edit, /delete, /create) AND the user has it,
  // grant access immediately for write operations. This bypasses the logic that might
  // incorrectly append another suffix (e.g., turning .../edit into .../edit/delete).
  if (!isReadMethod && permissions.includes(normalizedUrl)) {
    if (
      normalizedUrl.endsWith("/edit") ||
      normalizedUrl.endsWith("/delete") ||
      normalizedUrl.endsWith("/create")
    ) {
      return true;
    }
  }

  // 🔹 Action-based Permission Mapping
  // Only add action suffix if the URL doesn't already end with it
  let actionUrl = normalizedUrl;

  if (upperMethod === "DELETE") {
    if (!normalizedUrl.endsWith("/delete")) {
      actionUrl = `${normalizedUrl}/delete`;
    }
    // Special case: if the user has '.../edit' permission, allow DELETE operation
    // This handles cases like /policies/:id/edit controlling both edit and delete actions
    if (
      !permissions.includes(actionUrl) &&
      normalizedUrl.endsWith("/edit") &&
      permissions.includes(normalizedUrl)
    ) {
      return true;
    }
  } else if (upperMethod === "PUT" || upperMethod === "PATCH") {
    // Special case: /toggle actions should inherit from /edit permission
    if (normalizedUrl.endsWith("/toggle")) {
      actionUrl = normalizedUrl.replace("/toggle", "/edit");
    } else if (!normalizedUrl.endsWith("/edit")) {
      actionUrl = `${normalizedUrl}/edit`;
    }
  } else if (upperMethod === "POST") {
    // Special case for document actions: allow them to inherit from the main 'documents' permission
    if (normalizedUrl.includes("/documents/")) {
      for (const perm of permissions) {
        if (perm.includes(":id") && perm.endsWith("/documents")) {
          const permBase = perm.replace(":id", "");
          const urlBase = normalizedUrl.replace(":id", "");
          if (urlBase.startsWith(permBase)) {
            return true;
          }
        }
      }
    }

    // Special case for wallet actions: allow charge/deduct to inherit from wallet permission
    if (normalizedUrl.includes("/wallet/")) {
      for (const perm of permissions) {
        if (perm.includes(":id") && perm.endsWith("/wallet")) {
          const permBase = perm.replace(":id", "");
          const urlBase = normalizedUrl.replace(":id", "");
          if (urlBase.startsWith(permBase)) {
            return true;
          }
        }
      }
    }

    if (!normalizedUrl.endsWith("/create")) {
      actionUrl = `${normalizedUrl}/create`;
    }
  }

  // Special mapping: /notifications/send -> /notifications/create
  if (
    normalizedUrl === "/notifications/send" &&
    permissions.includes("/notifications/create")
  ) {
    return true;
  }

  // 1. Check mapped action permission specifically
  if (actionUrl !== normalizedUrl && permissions.includes(actionUrl)) {
    return true;
  }

  // 2. Exact match check
  if (permissions.includes(normalizedUrl)) {
    // For read operations, always grant access if there's an exact match
    if (isReadMethod) return true;

    // For write operations (POST, PUT, DELETE, PATCH), we must distinguish
    // between "Resource Pages" and "Specific Actions".
    // Giving access to a page (e.g. /drivers) should not grant write access (e.g. POST /drivers)
    // if a more specific action permission exists.

    const pathSegments = normalizedUrl.split("/").filter(Boolean);
    const isResourcePage =
      pathSegments.length === 1 || // e.g. /drivers
      (pathSegments.length === 2 && pathSegments[1] === ":id"); // e.g. /drivers/:id

    if (isResourcePage && actionUrl !== normalizedUrl) {
      // User has the base page permission but we are performing a write operation
      // that is covered by a more specific action permission.
      // Check if they have that action permission specifically.
      if (permissions.includes(actionUrl)) return true;

      // If they don't have the action, deny access to the write operation.
      return false;
    }

    return true; // It's a specific action path or no mapping exists
  }

  // 🔹 3. Check inheritance for data/stats endpoints from parent resource
  // Example: /contact permission should grant access to /contact/data
  // Note: 'export' is excluded as it requires explicit permission
  if (isReadMethod) {
    const pathParts = normalizedUrl.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    // Check if this is a data/stats endpoint (export requires explicit permission)
    if (["data", "stats"].includes(lastPart)) {
      // Get parent path
      const parentPath = "/" + pathParts.slice(0, -1).join("/");
      if (
        permissions.includes(parentPath) ||
        permissions.includes(`${parentPath}/edit`)
      ) {
        return true;
      }
    }
  }

  // 🔹 4. Check parent permission inheritance for nested actions (wallet, documents, etc.)
  // This allows /drivers/:id/wallet to grant access to /drivers/:id/wallet/charge
  // IMPORTANT: General resource pages like /coupons should NOT grant access to /coupons/:id
  // 🔹 4. Check parent permission inheritance for nested actions (wallet, documents, etc.)
  for (const perm of permissions) {
    // Allow inheritance for:
    // 1. All Read methods (GET) - e.g. /notifications allows /notifications/unseen
    // 2. Specific action paths for Write methods (wallet, documents)

    let shouldCheckInheritance = isReadMethod;

    if (!shouldCheckInheritance) {
      // For write methods, restriction applies
      const isActionPath =
        perm.endsWith("/wallet") || perm.endsWith("/documents");
      if (isActionPath) shouldCheckInheritance = true;
    }

    if (!shouldCheckInheritance) continue;

    if (perm.includes(":id")) {
      // Normalize both paths by replacing :id placeholder
      const permBase = perm.replace(":id", "");
      const urlBase = normalizedUrl.replace(":id", "");

      // Check if the URL is a child of the permission path
      if (urlBase.startsWith(permBase) && urlBase !== permBase) {
        return true;
      }
    }

    // Check if URL starts with permission (nested routes inheritance)
    if (normalizedUrl.startsWith(perm + "/")) {
      // 🛑 EXCEPTION: Prevent /policies from automatically granting access to specific policy pages
      // This ensures granular control so checking 'All Policies' doesn't automatically enable 'Privacy Policy' etc.
      if (
        perm === "/policies" &&
        ["/policies/privacy", "/policies/terms", "/policies/about"].includes(
          normalizedUrl
        )
      ) {
        continue;
      }

      // 🛑 EXCEPTION: Prevent broad inheritance for multi-page modules
      // Allow general sub-routes (like /data, /export, /types) if user has base permission (/drivers),
      // but REQUIRE explicit permission for individual item access (/drivers/:id, /drivers/create, etc.)
      const restrictedInheritance = [
        "/policies",
        "/roles",
        "/admins",
        "/customers",
        "/drivers",
        "/trips",
        "/coupons",
        "/vehicles",
        "/chats",
        "/contact",
        "/complaints",
      ];

      if (restrictedInheritance.includes(perm)) {
        // If it's an individual item access (with :id) or a creation page, require explicit permission
        if (
          normalizedUrl.startsWith(perm + "/:id") ||
          normalizedUrl === perm + "/create" ||
          normalizedUrl === perm + "/edit"
        ) {
          continue;
        }
      }

      return true;
    }
  }

  // 🔹 5. Special Case for Policy Items (which don't follow standard inheritance)
  // If we are managing items (POST/PUT/DELETE /policies/.../items...), allow if user has /policies/:id/edit
  if (
    normalizedUrl.includes("/policies/") &&
    normalizedUrl.includes("/items")
  ) {
    if (permissions.includes("/policies/:id/edit")) {
      return true;
    }
  }

  // For non-read methods without explicit permission, deny access
  return false;
};

/**
 * Public routes that don't require permission checking
 */
const publicRoutes = [
  "/index",
  "/",
  "/profile",
  "/alerts",
  "/api/notifications",
  "/api/navbar-notifications",
  "/map-data",
];

/**
 * Verify Token Middleware
 * - Validates JWT token from session
 * - Checks if admin exists and is active
 * - Super Admin (isAdmin: true) has full access
 * - Regular admins checked against role permissions
 */
const verifyToken = async (request, response, next) => {
  try {
    // 🔹 Check if session token exists
    const token = request.session.token;
    if (!token || token === "null" || token.split(".").length !== 3) {
      return response.redirect("/dashboard/login");
    }

    // 🔹 Verify JWT token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      if (!payload)
        return errorHandler(response, "unauthorized", "invalidToken");
    } catch (error) {
      console.error("❌ Invalid Token:", error.message);
      return response.redirect("/dashboard/login");
    }

    // 🔹 Fetch admin details with role populated
    const adminId = payload.sub ?? payload.subject?.id ?? payload.subject?._id;
    const admin = await Admin.findByPk(adminId, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!admin) return response.redirect("/dashboard/login");

    // 🔹 Check if admin is blocked or deleted
    if (admin.status === "block") {
      request.session.destroy();
      return response.redirect("/dashboard/login?error=blocked");
    }

    if (admin.status === "delete") {
      request.session.destroy();
      return response.redirect("/dashboard/login");
    }

    // 🔹 Check if user is Super Admin (isAdmin = true)
    if (admin.isAdmin === true) {
      console.log("✅ Super Admin Access Granted");

      // Still honor global restrictions if explicitly set to false (Account overrides)
      const method = request.method.toUpperCase();
      if (method === "DELETE" && admin.canDelete === false) {
        return errorHandler(
          response,
          "unauthorized",
          "globalRestrictionDelete"
        );
      }
      if (
        ["POST", "PUT", "PATCH"].includes(method) &&
        admin.canEdit === false
      ) {
        // Allow some essential POST requests if needed, but generally restrict modifications
        if (
          !publicRoutes.includes(
            sanitizeUrl(request.originalUrl || request.url)
          )
        ) {
          return errorHandler(
            response,
            "unauthorized",
            "globalRestrictionEdit"
          );
        }
      }

      request.adminId = adminId;
      request.admin = admin;
      request.user = admin;
      response.locals.user = admin;
      response.locals.isSuperAdmin = true;
      response.locals.permissions = ["all"];
      return next();
    }

    // 🔹 Global Restrictions (Account Overrides)
    const method = request.method.toUpperCase();
    if (method === "DELETE" && admin.canDelete === false) {
      return errorHandler(response, "unauthorized", "globalRestrictionDelete");
    }
    if (["POST", "PUT", "PATCH"].includes(method) && admin.canEdit === false) {
      // Allow essential public POST routes (if any)
      if (
        !publicRoutes.includes(sanitizeUrl(request.originalUrl || request.url))
      ) {
        return errorHandler(response, "unauthorized", "globalRestrictionEdit");
      }
    }

    // 🔹 Get admin's permissions from role
    const rolePermissions = admin.role?.permissions || [];

    // 🔹 Get and sanitize the requested URL
    const fullUrl = request.originalUrl || request.url;
    const sanitizedUrl = sanitizeUrl(fullUrl);

    console.log("🔐 Checking Permissions:", sanitizedUrl);

    // 🔹 Check for public routes
    if (publicRoutes.includes(sanitizedUrl)) {
      request.adminId = adminId;
      request.admin = admin;
      request.user = admin;
      response.locals.user = admin;
      response.locals.isSuperAdmin = false;
      response.locals.permissions = rolePermissions;
      return next();
    }

    // 🔹 Check permission
    if (checkPermission(sanitizedUrl, rolePermissions, request.method)) {
      console.log("✅ Permission Granted for:", sanitizedUrl);
      request.adminId = adminId;
      request.admin = admin;
      request.user = admin;
      response.locals.user = admin;
      response.locals.isSuperAdmin = false;
      response.locals.permissions = rolePermissions;
      return next();
    }

    console.warn("⚠️ Unauthorized Access Attempt:", sanitizedUrl);

    // Check if it's an API request
    // Added content-type check because standard fetch() requests may not set Accept header matched by previous check,
    // but do set Content-Type when sending JSON data or files (multipart).
    const isApiRequest =
      request.xhr ||
      request.headers.accept?.includes("application/json") ||
      (request.headers["content-type"] &&
        request.headers["content-type"]
          .toLowerCase()
          .includes("application/json")) ||
      (request.headers["content-type"] &&
        request.headers["content-type"]
          .toLowerCase()
          .includes("multipart/form-data"));

    if (isApiRequest) {
      return errorHandler(response, "unauthorized", "noPermission");
    }

    return response
      .status(401)
      .render("admin/401Page/401", {
        layout: false,
        locale: request.getLocale(),
      });
  } catch (error) {
    console.error("❌ Middleware Error:", error);
    return response.redirect("/dashboard/login");
  }
};

/**
 * Permission Check Middleware Factory
 * Creates a middleware that checks for a specific permission
 * @param {string} permission - The required permission
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return async (request, response, next) => {
    const admin = request.admin;

    if (!admin) {
      return response.redirect("/dashboard/login");
    }

    // Super admin has all permissions
    if (admin.isAdmin) {
      return next();
    }

    const rolePermissions = admin.role?.permissions || [];

    if (checkPermission(permission, rolePermissions, request.method)) {
      return next();
    }

    const isApiRequest =
      request.xhr ||
      request.headers.accept?.includes("application/json") ||
      (request.headers["content-type"] &&
        request.headers["content-type"]
          .toLowerCase()
          .includes("application/json")) ||
      (request.headers["content-type"] &&
        request.headers["content-type"]
          .toLowerCase()
          .includes("multipart/form-data"));

    if (isApiRequest) {
      return errorHandler(response, "unauthorized", "noPermission");
    }

    return response
      .status(401)
      .render("admin/401Page/401", {
        layout: false,
        locale: request.getLocale(),
      });
  };
};

export default verifyToken;
export { requirePermission };
