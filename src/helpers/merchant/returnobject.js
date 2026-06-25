import { sharedVariable } from '../../config/index.js';

const userAvatarUrl = (avatar) =>
    avatar && avatar !== 'default.jpg'
        ? `${sharedVariable.address}${sharedVariable.usersImage}${avatar}`
        : '';

const returnObject = {
    personalProfile: (item, token = '') => ({
        id: item?.id,
        name: item?.name,
        phone: item?.phone,
        token,
    }),

    driverProfile: (item, token = '') => ({
        id: item?.id,
        name: item?.name,
        phone: item?.phone,
        token,
    }),

    cashier: (item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        avatar: userAvatarUrl(item.avatar),
        language: item.language,
        status: item.status,
        active: item.active,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    cashierProfile: (cashier, token = '') => ({
        id: cashier.id,
        name: cashier.name,
        email: cashier.email,
        phone: cashier.phone,
        avatar: userAvatarUrl(cashier.avatar),
        language: cashier.language,
        status: cashier.status,
        token,
    }),

    cashierLoginSummary: (cashier, token, access, platform, branch = null, company = null) => ({
        name: cashier.name,
        email: cashier.email,
        avatar: userAvatarUrl(cashier.avatar),
        token,
        active: Boolean(cashier.active),
        branchId: branch?.id || null,
        branchName: branch?.name || null,
        companyId: company?.id || null,
        companyName: company?.name || null,
        hasActiveSubscription: access.hasActiveSubscription,
        needsPayment: access.needsPayment,
        canUsePaidFeatures: access.canUsePaidFeatures,
        subscriptionGrace: access.subscriptionGrace ?? false,
        subscriptionGraceDaysLeft: access.subscriptionGraceDaysLeft ?? null,
        entitlements: access.entitlements ?? [],
        selectedPlatform: platform,
        deploymentTier: access.deploymentTier || 'online',
        offlineLicense: access.offlineLicense || { required: false, expiresAt: null, graceDays: 0 },
        store: access.store || { enabled: false },
    }),

    merchantSessionProfile: (merchant, company, token = '') => ({
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        language: merchant.language,
        company: company
            ? {
                  id: company.id,
                  name: company.name,
                  status: company.status,
                  logo: company.logo,
              }
            : null,
        token,
    }),

    companySubscription: (item, lang = 'ar') => ({
        id: item.id,
        companyId: item.companyId,
        companyName: item.company?.name || null,
        subscriptionPlanId: item.subscriptionPlanId,
        platform: item.platform,
        status: item.status,
        startsAt: item.startsAt,
        expiresAt: item.expiresAt,
        activatedAt: item.activatedAt,
        notes: item.notes,
        plan: item.subscriptionPlan
            ? {
                  id: item.subscriptionPlan.id,
                  name:
                      item.subscriptionPlan.getLocalizedName?.(lang) ||
                      item.subscriptionPlan.name?.[lang] ||
                      item.subscriptionPlan.name?.ar,
                  price: item.subscriptionPlan.price,
                  billingCycle: item.subscriptionPlan.billingCycle,
                  platform: item.subscriptionPlan.platform,
                  maxBranches: item.subscriptionPlan.maxBranches,
                  maxDevices: item.subscriptionPlan.maxDevices,
              }
            : null,
    }),
};

export default returnObject;
