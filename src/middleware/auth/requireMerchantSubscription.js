import { errorHandler } from '../../helpers/index.js';
import { CompanySubscription } from '../../models/index.js';

const GRACE_DAYS = parseInt(process.env.MERCHANT_SUBSCRIPTION_GRACE_DAYS || '7', 10);

const isApiRequest = (req) => {
    const path = req.originalUrl || req.url || '';
    return (
        path.includes('/merchant/stats') ||
        path.includes('/merchant/branch') ||
        path.includes('/merchant/company') ||
        path.includes('/merchant/cashier') ||
        req.headers.accept?.includes('application/json') ||
        req.xhr
    );
};

const denyAccess = (req, res, messageKey) => {
    if (isApiRequest(req)) {
        return errorHandler(res, 'fail', messageKey);
    }
    return null;
};

const requireMerchantSubscription = async (req, res, next) => {
    try {
        const companyId = req.merchant?.companyId || req.company?.id;
        if (!companyId) {
            const denied = denyAccess(req, res, 'subscriptionRequired');
            if (denied) return denied;
            return res.redirect('/merchant/plans');
        }

        const activeSub = await CompanySubscription.findOne({
            where: { companyId, status: 'active' },
        });

        if (activeSub) {
            if (activeSub.expiresAt) {
                const expiresAt = new Date(activeSub.expiresAt);
                const now = new Date();
                if (expiresAt <= now) {
                    const msPast = now.getTime() - expiresAt.getTime();
                    const daysPast = Math.floor(msPast / (1000 * 60 * 60 * 24));
                    if (daysPast < GRACE_DAYS) {
                        req.companySubscription = activeSub;
                        req.subscriptionGrace = true;
                        req.subscriptionGraceDaysLeft = GRACE_DAYS - daysPast;
                        return next();
                    }
                    const denied = denyAccess(req, res, 'subscriptionExpired');
                    if (denied) return denied;
                    return res.redirect('/merchant/plans');
                }
            }
            req.companySubscription = activeSub;
            return next();
        }

        const pendingSub = await CompanySubscription.findOne({
            where: { companyId, status: 'pending' },
        });

        if (pendingSub) {
            const denied = denyAccess(req, res, 'subscriptionPending');
            if (denied) return denied;
            return res.redirect('/merchant/payment-pending');
        }

        const denied = denyAccess(req, res, 'subscriptionRequired');
        if (denied) return denied;
        return res.redirect('/merchant/plans');
    } catch (err) {
        console.error('requireMerchantSubscription error:', err);
        const denied = denyAccess(req, res, 'subscriptionRequired');
        if (denied) return denied;
        return res.redirect('/merchant/plans');
    }
};

export default requireMerchantSubscription;
