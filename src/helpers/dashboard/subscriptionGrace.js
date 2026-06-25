/**
 * Shared subscription grace-period logic (merchant portal + cashier API).
 * Uses MERCHANT_SUBSCRIPTION_GRACE_DAYS env (default 7).
 */

export const getSubscriptionGraceDays = () =>
    parseInt(process.env.MERCHANT_SUBSCRIPTION_GRACE_DAYS || '7', 10);

/**
 * @param {import('../../models/platform/companySubscriptionModel.js').default|null|undefined} sub
 */
export const evaluateSubscriptionAccess = (sub) => {
    const graceDays = getSubscriptionGraceDays();

    if (!sub || sub.status !== 'active') {
        return {
            valid: false,
            inGrace: false,
            canUsePaidFeatures: false,
            expired: false,
            graceDaysLeft: 0,
        };
    }

    if (!sub.expiresAt) {
        return {
            valid: true,
            inGrace: false,
            canUsePaidFeatures: true,
            expired: false,
            graceDaysLeft: null,
            expiresAt: null,
        };
    }

    const expiresAt = new Date(sub.expiresAt);
    const now = new Date();

    if (expiresAt > now) {
        return {
            valid: true,
            inGrace: false,
            canUsePaidFeatures: true,
            expired: false,
            graceDaysLeft: null,
            expiresAt,
        };
    }

    const daysPast = Math.floor((now.getTime() - expiresAt.getTime()) / 86400000);

    if (daysPast < graceDays) {
        return {
            valid: true,
            inGrace: true,
            canUsePaidFeatures: true,
            expired: false,
            graceDaysLeft: graceDays - daysPast,
            expiresAt,
        };
    }

    return {
        valid: false,
        inGrace: false,
        canUsePaidFeatures: false,
        expired: true,
        graceDaysLeft: 0,
        expiresAt,
    };
};

export default {
    getSubscriptionGraceDays,
    evaluateSubscriptionAccess,
};
