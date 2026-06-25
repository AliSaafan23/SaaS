import jwt from 'jsonwebtoken';
import { Admin, Role, UserToken } from '../../models/index.js';
import { errorHandler } from '../../helpers/index.js';

/**
 * Session-based dashboard auth — validates JWT in session without URL permission checks.
 * Use requirePermission (dot keys) on individual routes after this middleware.
 */
const requireDashboardSession = async (req, res, next) => {
    try {
        const token = req.session?.token;
        if (!token || token === 'null' || token.split('.').length !== 3) {
            return errorHandler(res, 'unauthorized', 'mustAuth');
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        } catch {
            req.session.destroy(() => {});
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        const adminId = payload.sub ?? payload.subject?.id ?? payload.subject?._id;
        if (!adminId) {
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        const stored = await UserToken.findOne({
            where: { userId: adminId, token, expired: false, userRef: 'Admin' },
        });
        if (!stored) {
            return errorHandler(res, 'unauthorized', 'tokenExpired');
        }

        const admin = await Admin.findByPk(adminId, {
            include: [{ model: Role, as: 'role' }],
        });

        if (!admin || admin.status === 'delete') {
            return errorHandler(res, 'unauthorized', 'adminNotFound');
        }

        if (admin.status === 'block') {
            return errorHandler(res, 'blocked', 'accountStop');
        }

        req.admin = admin;
        req.user = admin;
        return next();
    } catch (err) {
        console.error('requireDashboardSession error:', err);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export default requireDashboardSession;
