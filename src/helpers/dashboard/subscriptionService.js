import { Op } from 'sequelize';
import {
    Cashier,
    SubscriptionPlan,
    SubscriptionPayment,
    SystemSetting,
    UserToken,
    Branch,
    Company,
    CompanySubscription,
} from '../../models/index.js';
import { DEFAULT_FREE_ACCESS_FEATURES, ALL_FEATURE_KEYS } from '../../config/subscriptionFeatures.js';
import { SUBSCRIPTION_SETTING_KEYS } from '../../config/subscriptionProtection.js';
import { normalizePlatform, FREE_FEATURE_KEYS } from '../../config/subscriptionAccess.js';
import { evaluateSubscriptionAccess } from './subscriptionGrace.js';
import { normalizeDeploymentTier, getOfflineLicenseGraceDays } from '../../config/offlineLicense.js';

const CYCLE_DAYS = { monthly: 30, annual: 365, lifetime: null };

export const isSubscriptionValid = (sub) => evaluateSubscriptionAccess(sub).valid;

export const getActiveCompanySubscriptions = async (companyId) => {
    const subs = await CompanySubscription.findAll({
        where: { companyId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });
    return subs.filter(isSubscriptionValid);
};

/**
 * Pick the company subscription for cashier login.
 * - Platform must match exactly (x-platform or deviceType) — no cross-platform fallback
 * - Auto-pick only when no platform could be determined at all
 */
export const resolveCompanySubscriptionForLogin = async (companyId, requestedPlatform) => {
    const activeSubs = await getActiveCompanySubscriptions(companyId);

    if (!activeSubs.length) {
        return { sub: null, platform: requestedPlatform, reason: 'none' };
    }

    if (requestedPlatform) {
        const exact = activeSubs.find((s) => s.platform === requestedPlatform);
        if (exact) {
            return { sub: exact, platform: requestedPlatform, reason: null };
        }
        return {
            sub: null,
            platform: requestedPlatform,
            reason: 'wrongPlatform',
            availablePlatforms: activeSubs.map((s) => s.platform),
        };
    }

    if (activeSubs.length === 1) {
        return { sub: activeSubs[0], platform: activeSubs[0].platform, reason: 'auto' };
    }

    return {
        sub: null,
        platform: null,
        reason: 'platformRequired',
        availablePlatforms: activeSubs.map((s) => s.platform),
    };
};

export const computeExpiresAt = (plan, fromDate = new Date()) => {
    if (plan.billingCycle === 'lifetime') return null;
    const days = plan.durationDays || CYCLE_DAYS[plan.billingCycle] || 30;
    return new Date(fromDate.getTime() + days * 86400000);
};

/** Auto-activate company subscription after Paymob success */
export const confirmSubscriptionPayment = async ({
    merchantOrderId,
    gatewayTransactionId = null,
    gatewayOrderId = null,
    adminId = null,
}) => {
    const payment = await SubscriptionPayment.findOne({
        where: { merchantOrderId, status: 'pending' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });

    if (!payment) throw new Error('paymentNotFound');

    const now = new Date();
    await payment.update({
        status: 'paid',
        paidAt: now,
        gatewayTransactionId,
        gatewayOrderId,
        confirmedByAdminId: adminId,
        method: adminId ? 'manual' : 'paymob',
    });

    return activateCompanySubscription({
        companyId: payment.companyId,
        subscriptionPlanId: payment.subscriptionPlanId,
        adminId,
        notes: `دفع تلقائي — ${merchantOrderId}`,
        paymentId: payment.id,
    });
};

export const getFreeAccessFeatures = async () => {
    const row = await SystemSetting.findOne({
        where: { settingKey: 'subscription' },
    });
    const list = row?.settingValue?.freeAccessFeatures;
    if (Array.isArray(list)) return list;
    const legacy = await SystemSetting.findOne({
        where: { settingKey: SUBSCRIPTION_SETTING_KEYS.freeAccessFeatures },
    });
    if (Array.isArray(legacy?.settingValue) && legacy.settingValue.length) {
        return legacy.settingValue;
    }
    return DEFAULT_FREE_ACCESS_FEATURES;
};

export const buildEntitlements = async (cashierId, platform) => {
    const free = await getFreeAccessFeatures();
    const entitlements = new Set(free);

    if (!cashierId) return [...entitlements];

    const cashier = await Cashier.findByPk(cashierId, {
        include: [{ model: Branch, as: 'branch' }],
    });
    const companyId = cashier?.branch?.companyId;
    if (!companyId) return [...entitlements];

    const sub = await CompanySubscription.findOne({
        where: { companyId, platform, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });

    if (!sub) return [...entitlements];

    const access = evaluateSubscriptionAccess(sub);
    if (!access.canUsePaidFeatures) return [...entitlements];

    const planFeatures = sub.subscriptionPlan?.features;
    if (Array.isArray(planFeatures)) {
        if (planFeatures.includes('all')) {
            ALL_FEATURE_KEYS.forEach((k) => entitlements.add(k));
        } else {
            planFeatures.forEach((k) => entitlements.add(k));
        }
    }

    return [...entitlements];
};

export const hasPaidPlatformAccess = async (cashierId, platform) => {
    const p = normalizePlatform(platform);
    const cashier = await Cashier.findByPk(cashierId, {
        include: [{ model: Branch, as: 'branch' }],
    });
    const companyId = cashier?.branch?.companyId;
    if (!companyId) return false;

    const sub = await CompanySubscription.findOne({
        where: { companyId, platform: p, status: 'active' },
    });
    if (!sub) return false;
    return evaluateSubscriptionAccess(sub).canUsePaidFeatures;
};

export const getMaxDevicesForCashier = async (cashierId, platform) => {
    const p = normalizePlatform(platform);
    const cashier = await Cashier.findByPk(cashierId, {
        include: [{ model: Branch, as: 'branch' }],
    });
    const companyId = cashier?.branch?.companyId;
    if (!companyId) return 1;

    const sub = await CompanySubscription.findOne({
        where: { companyId, platform: p, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });
    if (!sub?.subscriptionPlan) return 1;
    return Math.max(1, Number(sub.subscriptionPlan.maxDevices) || 1);
};

export const getCashierPlatformSubscriptions = async (cashierId) => {
    const cashier = await Cashier.findByPk(cashierId, {
        include: [{ model: Branch, as: 'branch' }],
    });
    const companyId = cashier?.branch?.companyId;
    if (!companyId) return [];

    return CompanySubscription.findAll({
        where: { companyId },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
        order: [['platform', 'ASC']],
    });
};

export const getLatestPendingPayment = async (cashierId) => {
    const cashier = await Cashier.findByPk(cashierId, {
        include: [{ model: Branch, as: 'branch' }],
    });
    const companyId = cashier?.branch?.companyId;
    if (!companyId) return null;

    return SubscriptionPayment.findOne({
        where: { companyId, status: 'pending' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
        order: [['id', 'DESC']],
    });
};

export const buildCashierAccessPayload = async (cashier, platformHeader) => {
    const platform = normalizePlatform(platformHeader);
    const subs = await getCashierPlatformSubscriptions(cashier.id);
    const pendingPayment = await getLatestPendingPayment(cashier.id);
    const activeForPlatform = subs.find(
        (s) => s.platform === platform && evaluateSubscriptionAccess(s).canUsePaidFeatures
    );
    const entitlements = await buildEntitlements(cashier.id, platform);
    const subscriptionAccess = activeForPlatform
        ? evaluateSubscriptionAccess(activeForPlatform)
        : { inGrace: false, graceDaysLeft: 0, canUsePaidFeatures: false };
    const maxDevices = activeForPlatform
        ? Math.max(1, Number(activeForPlatform.subscriptionPlan?.maxDevices) || 1)
        : 1;
    const activeDeviceCount = await UserToken.count({
        where: {
            userId: cashier.id,
            userRef: 'Cashier',
            expired: false,
            platform,
        },
    });

    const deploymentTier = normalizeDeploymentTier(
        activeForPlatform?.subscriptionPlan?.deploymentTier
    );
    const graceDays = getOfflineLicenseGraceDays();

    return {
        accountStatus: cashier.status,
        needsPayment: !activeForPlatform && !!pendingPayment,
        hasActiveSubscription: !!activeForPlatform && !subscriptionAccess.inGrace,
        subscriptionGrace: subscriptionAccess.inGrace,
        subscriptionGraceDaysLeft: subscriptionAccess.graceDaysLeft ?? null,
        selectedPlatform: platform,
        deploymentTier,
        companySubscriptions: subs,
        pendingPayment,
        entitlements,
        freeFeatures: FREE_FEATURE_KEYS,
        canUsePaidFeatures: subscriptionAccess.canUsePaidFeatures,
        maxDevices,
        activeDeviceCount,
        offlineLicense: {
            required: deploymentTier === 'offline',
            expiresAt: activeForPlatform?.expiresAt || null,
            graceDays,
        },
        store: {
            enabled: deploymentTier === 'online',
        },
    };
};

export const requestCompanySubscription = async ({ companyId, subscriptionPlanId }) => {
    const company = await Company.findByPk(companyId);
    if (!company) {
        throw new Error('companyNotFound');
    }

    const plan = await SubscriptionPlan.findByPk(subscriptionPlanId);
    if (!plan || !plan.isActive) {
        throw new Error('invalidPlan');
    }

    const activeSub = await CompanySubscription.findOne({
        where: { companyId, platform: plan.platform, status: 'active' },
    });
    if (activeSub) {
        throw new Error('alreadySubscribed');
    }

    const [sub] = await CompanySubscription.findOrCreate({
        where: { companyId, platform: plan.platform },
        defaults: {
            companyId,
            subscriptionPlanId: plan.id,
            platform: plan.platform,
            status: 'pending',
            notes: '',
        },
    });

    if (sub.status === 'active') {
        throw new Error('alreadySubscribed');
    }

    await sub.update({ subscriptionPlanId: plan.id, status: 'pending' });

    // Mark previous pending payments as failed
    await SubscriptionPayment.update(
        { status: 'failed', notes: 'استبدال بطلب دفع جديد' },
        { where: { companyId, platform: plan.platform, status: 'pending' } }
    );

    const merchantOrderId = `GOLDPOS-COMP-${companyId}-${plan.platform}-${Date.now()}`;

    const payment = await SubscriptionPayment.create({
        companyId,
        companySubscriptionId: sub.id,
        subscriptionPlanId: plan.id,
        platform: plan.platform,
        amount: plan.price,
        merchantOrderId,
        status: 'pending',
        method: 'manual',
    });

    return { subscription: sub, payment, plan };
};

export const activateCompanySubscription = async ({
    companyId,
    subscriptionPlanId,
    adminId,
    notes = '',
    paymentId = null,
}) => {
    const company = await Company.findByPk(companyId);
    if (!company) {
        throw new Error('companyNotFound');
    }

    const plan = await SubscriptionPlan.findByPk(subscriptionPlanId);
    if (!plan || !plan.isActive) {
        throw new Error('invalidPlan');
    }

    const now = new Date();
    const expiresAt = computeExpiresAt(plan, now);

    const [record] = await CompanySubscription.findOrCreate({
        where: { companyId, platform: plan.platform },
        defaults: {
            companyId,
            subscriptionPlanId: plan.id,
            platform: plan.platform,
            status: 'active',
            startsAt: now,
            expiresAt,
            activatedByAdminId: adminId,
            activatedAt: now,
            notes,
        },
    });

    if (!record.isNewRecord) {
        await record.update({
            subscriptionPlanId: plan.id,
            status: 'active',
            startsAt: now,
            expiresAt,
            activatedByAdminId: adminId,
            activatedAt: now,
            notes,
        });
    }

    const paymentWhere = paymentId
        ? { id: paymentId, companyId }
        : { companyId, platform: plan.platform, status: 'pending' };

    await SubscriptionPayment.update(
        {
            status: 'paid',
            paidAt: now,
            confirmedByAdminId: adminId || null,
            companySubscriptionId: record.id,
            notes: notes || '',
        },
        { where: paymentWhere }
    );

    await company.update({
        status: 'active',
    });

    // Also activate cashiers of this company if they were pending
    const cashiers = await Cashier.findAll({
        include: [{
            model: Branch,
            as: 'branch',
            where: { companyId },
        }],
    });
    for (const cashier of cashiers) {
        if (cashier.status === 'pending') {
            await cashier.update({ status: 'active', active: true });
        }
    }

    return CompanySubscription.findByPk(record.id, {
        include: [
            { model: SubscriptionPlan, as: 'subscriptionPlan' },
            { model: Company, as: 'company' },
        ],
    });
};

export const suspendCompanySubscription = async (companyId, platform) => {
    const sub = await CompanySubscription.findOne({ where: { companyId, platform } });
    if (!sub) throw new Error('subscriptionNotFound');
    await sub.update({ status: 'suspended' });
    
    // Expire cashier sessions for all cashiers in this company's branches on this platform
    const cashiers = await Cashier.findAll({
        include: [{
            model: Branch,
            as: 'branch',
            where: { companyId },
        }],
    });
    const { expireCashierPlatformSessions } = await import('../api/deviceSession.js');
    for (const cashier of cashiers) {
        await expireCashierPlatformSessions(cashier.id, platform);
    }

    return sub;
};

export const getSubscriberStats = async () => {
    const [totalSubscribers, awaitingActivation, activeSubs, expiredSubs, pendingPayments] =
        await Promise.all([
            Company.count(),
            Company.count({ where: { status: 'pending' } }),
            CompanySubscription.count({ where: { status: 'active' } }),
            CompanySubscription.count({ where: { status: 'expired' } }),
            SubscriptionPayment.count({ where: { status: 'pending' } }),
        ]);

    return { totalSubscribers, awaitingActivation, activeSubs, expiredSubs, pendingPayments };
};

export const listPendingPayments = async (limit = 100) => {
    return SubscriptionPayment.findAll({
        where: { status: 'pending' },
        include: [
            { model: Company, as: 'company', attributes: ['id', 'name', 'phone', 'status'] },
            { model: SubscriptionPlan, as: 'subscriptionPlan' },
        ],
        order: [['id', 'DESC']],
        limit: Math.min(limit, 500),
    });
};

export default {
    computeExpiresAt,
    confirmSubscriptionPayment,
    getFreeAccessFeatures,
    buildEntitlements,
    hasPaidPlatformAccess,
    getMaxDevicesForCashier,
    getCashierPlatformSubscriptions,
    getLatestPendingPayment,
    buildCashierAccessPayload,
    getSubscriberStats,
    listPendingPayments,
    requestCompanySubscription,
    activateCompanySubscription,
    suspendCompanySubscription,
    resolveCompanySubscriptionForLogin,
    getActiveCompanySubscriptions,
};
