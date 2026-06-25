import jwt from 'jsonwebtoken';
import { Merchant, UserToken } from '../../models/index.js';
import { errorHandler } from '../../helpers/index.js';

/**
 * Middleware to authenticate Merchant users via Bearer token.
 * Attaches req.merchant with the authenticated merchant.
 */
export const requireMerchant = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        let token = authHeader.replace('Bearer ', '').trim();

        if ((!token || token === 'null') && req.session?.token) {
            token = req.session.token;
        }

        if (!token || token === 'null' || token.split('.').length !== 3) {
            return errorHandler(res, 'unauthorized', 'mustAuth');
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        } catch {
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        const merchantId = payload.sub ?? payload.subject?.id ?? payload.subject?._id;
        if (!merchantId) {
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        // Verify token exists and is not expired
        const stored = await UserToken.findOne({
            where: { userId: merchantId, token, expired: false, userRef: 'Merchant' },
        });
        if (!stored) {
            return errorHandler(res, 'unauthorized', 'tokenExpired');
        }

        const merchant = await Merchant.findByPk(merchantId);

        if (!merchant || merchant.status === 'delete') {
            return errorHandler(res, 'unauthorized', 'merchantNotFound');
        }

        if (merchant.status === 'suspended') {
            return errorHandler(res, 'blocked', 'accountStop');
        }

        req.merchant = merchant;
        req.user = merchant;
        return next();
    } catch (err) {
        console.error('requireMerchant error:', err);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export default requireMerchant;
