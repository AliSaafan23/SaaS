import { hasPermission } from '../../helpers/dashboard/tenantPermissions.js';

/** Block dashboard UI pages when the logged-in user lacks the required permission. */
const requirePagePermission = (permission) => (req, res, next) => {
    if (!permission || hasPermission(req.tenantUser, permission)) return next();
    return res.status(403).render('admin/errors/forbidden', {
        pageTitleKey: 'errors.forbiddenTitle',
        page: 'forbidden',
        user: req.tenantUser,
    });
};

export default requirePagePermission;
