import { UserToken } from '../../models/index.js';
import { normalizePlatform, PLATFORM_HEADER } from '../../config/subscriptionAccess.js';
import { getCashierPlatformSubscriptions } from '../dashboard/subscriptionService.js';
import { evaluateSubscriptionAccess } from '../dashboard/subscriptionGrace.js';

/**
 * Resolve cashier API platform for subscription checks.
 * 1. x-platform header (or body.platform)
 * 2. platform stored on the current JWT session (UserToken)
 * 3. sole active company subscription platform
 * 4. default mobile
 */
export const resolveCashierPlatform = async (req, cashierId = null) => {
    const explicit = req.headers?.[PLATFORM_HEADER] || req.body?.platform;
    if (explicit && String(explicit).trim()) {
        return normalizePlatform(explicit);
    }

    const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (bearerToken) {
        const session = await UserToken.findOne({
            where: { token: bearerToken, expired: false },
            attributes: ['platform'],
        });
        if (session?.platform) {
            return normalizePlatform(session.platform);
        }
    }

    const id = cashierId ?? req.cashier?.id ?? req.user?.id;
    if (id) {
        const subs = await getCashierPlatformSubscriptions(id);
        const active = subs.filter((s) => evaluateSubscriptionAccess(s).canUsePaidFeatures);
        if (active.length === 1) {
            return active[0].platform;
        }
        if (active.length > 1) {
            const desktop = active.find((s) => s.platform === 'desktop');
            return desktop?.platform || active[0].platform;
        }
    }

    return normalizePlatform(null);
};

export default { resolveCashierPlatform };
