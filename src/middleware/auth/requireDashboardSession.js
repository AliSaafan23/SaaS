import jwt from 'jsonwebtoken';
import { TenantUser, Tenant, UserToken } from '../../models/index.js';
import { errorHandler } from '../../helpers/index.js';

const requireDashboardSession = async (req, res, next) => {
    try {
        const token = req.session?.token;
        if (!token || token === 'null' || token.split('.').length !== 3) {
            return errorHandler(res, 'unauthorized', 'mustAuth');
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        } catch {
            req.session.destroy(() => {});
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        const userId = payload.sub;
        const tenantId = payload.tenantId;
        if (!userId || !tenantId) {
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        const stored = await UserToken.findOne({
            where: { userId, token, expired: false, userRef: 'TenantUser' },
        });
        if (!stored) {
            return errorHandler(res, 'unauthorized', 'tokenExpired');
        }

        const user = await TenantUser.findByPk(userId, {
            include: [{ model: Tenant, as: 'tenant' }],
        });

        if (!user || user.status === 'delete') {
            return errorHandler(res, 'unauthorized', 'userNotFound');
        }
        if (user.status === 'block') {
            return errorHandler(res, 'blocked', 'accountStop');
        }
        if (user.tenant?.status === 'suspended') {
            return errorHandler(res, 'blocked', 'tenantSuspended');
        }

        req.tenantId = tenantId;
        req.tenantUser = user;
        req.admin = user;
        req.user = user;
        return next();
    } catch (err) {
        console.error('requireDashboardSession error:', err);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export default requireDashboardSession;
