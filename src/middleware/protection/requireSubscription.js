import { errorHandler } from '../../helpers/index.js';
import {
    getFreeAccessFeatures,
    buildEntitlements,
} from '../../helpers/dashboard/subscriptionService.js';
import { evaluateSubscriptionAccess } from '../../helpers/dashboard/subscriptionGrace.js';
import { resolveCashierPlatform } from '../../helpers/api/cashierPlatform.js';
import { Branch, CompanySubscription, SubscriptionPlan } from '../../models/index.js';

/**
 * Require active subscription or free-tier feature key on API routes.
 * Usage: router.post('/sales', requireAuth, requireSubscription('sales.create'), handler)
 */
export const requireSubscription = (featureKey) => async (req, res, next) => {
    try {
        const cashier = req.cashier || req.user;
        if (!cashier) {
            return errorHandler(res, 'unauthorized', 'mustAuth');
        }

        const cashierId = cashier.id;
        const platform = await resolveCashierPlatform(req, cashierId);

        const freeFeatures = await getFreeAccessFeatures();
        if (freeFeatures.includes(featureKey)) {
            return next();
        }

        let companyId = cashier.companyId;
        if (!companyId && cashier.branchId) {
            const branch = await Branch.findByPk(cashier.branchId);
            companyId = branch?.companyId;
        }

        if (!companyId) {
            return errorHandler(res, 'fail', 'subscriptionRequired');
        }

        const sub = await CompanySubscription.findOne({
            where: { companyId, platform, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
        });

        if (!sub) {
            return errorHandler(res, 'fail', 'subscriptionRequired');
        }

        const access = evaluateSubscriptionAccess(sub);
        if (!access.canUsePaidFeatures) {
            if (access.expired) {
                return errorHandler(res, 'fail', 'subscriptionExpired');
            }
            return errorHandler(res, 'fail', 'subscriptionRequired');
        }

        const planFeatures = sub.subscriptionPlan?.features || [];
        const allowed =
            planFeatures.includes('all') ||
            planFeatures.includes(featureKey);

        if (!allowed) {
            return errorHandler(res, 'fail', 'featureNotInPlan');
        }

        req.companySubscription = sub;
        req.companyId = companyId;
        req.branchId = req.branchId ?? cashier.branchId;
        req.subscriptionGrace = access.inGrace;
        req.subscriptionGraceDaysLeft = access.graceDaysLeft ?? null;
        req.entitlements = await buildEntitlements(cashierId, platform);
        return next();
    } catch (err) {
        console.error('requireSubscription error:', err);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export const requireActivePlatform = (platform) => (req, res, next) => {
    const headerPlatform = req.headers['x-platform'];
    if (headerPlatform && headerPlatform !== platform) {
        return errorHandler(res, 'fail', 'wrongPlatformSubscription');
    }
    return next();
};

export default { requireSubscription, requireActivePlatform };
