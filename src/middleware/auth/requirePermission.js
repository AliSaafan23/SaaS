import { adminHasPermission } from '../../config/permissions.js';
import { errorHandler } from '../../helpers/index.js';

/**
 * Require a specific permission key (e.g. roles.create)
 * Super admin (isAdmin) bypasses check
 */
export const requirePermission = (permission) => (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
        return errorHandler(res, 'unauthorized', 'mustAuth');
    }

    if (adminHasPermission(admin, permission)) {
        return next();
    }

    return errorHandler(res, 'unauthorized', 'noPermission');
};

/**
 * Block write operations when admin.canEdit / canDelete is false
 */
export const requireCanEdit = (req, res, next) => {
    if (req.admin?.isAdmin || req.admin?.canEdit !== false) {
        return next();
    }
    return errorHandler(res, 'unauthorized', 'globalRestrictionEdit');
};

export const requireCanDelete = (req, res, next) => {
    if (req.admin?.isAdmin || req.admin?.canDelete !== false) {
        return next();
    }
    return errorHandler(res, 'unauthorized', 'globalRestrictionDelete');
};

export default { requirePermission, requireCanEdit, requireCanDelete };
