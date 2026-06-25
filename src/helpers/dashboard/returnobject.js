import { sharedVariable } from '../../config/index.js';
import { planToMonthlyMrr } from './companyMetrics.js';

const avatarUrl = (avatar) =>
    avatar && avatar !== 'default.jpg'
        ? `${sharedVariable.address}${sharedVariable.adminImage}${avatar}`
        : '';

const returnObject = {
    adminProfile: (admin, token = '') => {
        const lang = admin?.language || 'ar';
        const role = admin?.role;

        return {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            avatar: avatarUrl(admin.avatar),
            language: admin.language,
            theme: admin.theme,
            isAdmin: admin.isAdmin,
            canEdit: admin.canEdit,
            canDelete: admin.canDelete,
            role: role
                ? {
                      id: role.id,
                      name: role.getLocalizedName(lang),
                      description: role.getLocalizedDescription(lang),
                      color: role.color,
                      permissions: role.permissions || [],
                  }
                : null,
            permissions: admin.isAdmin
                ? ['all']
                : role?.permissions || [],
            token,
        };
    },

    role: (item, lang = 'ar') => ({
        id: item.id,
        name: item.getLocalizedName(lang),
        nameRaw: item.name,
        description: item.getLocalizedDescription(lang),
        descriptionRaw: item.description,
        permissions: item.permissions || [],
        isAdmin: item.isAdmin,
        isActive: item.isActive,
        color: item.color,
        adminsCount: item.adminsCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    admin: (item, lang = 'ar') => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        avatar: avatarUrl(item.avatar),
        language: item.language,
        theme: item.theme,
        status: item.status,
        isAdmin: item.isAdmin,
        canEdit: item.canEdit,
        canDelete: item.canDelete,
        role: item.role
            ? {
                  id: item.role.id,
                  name: item.role.getLocalizedName(lang),
                  color: item.role.color,
              }
            : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    subscriptionPayment: (item, lang = 'ar') => ({
        id: item.id,
        companyId: item.companyId,
        companyName: item.company?.name || null,
        companySubscriptionId: item.companySubscriptionId,
        subscriptionPlanId: item.subscriptionPlanId,
        platform: item.platform,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        method: item.method,
        merchantOrderId: item.merchantOrderId,
        gatewayOrderId: item.gatewayOrderId,
        gatewayTransactionId: item.gatewayTransactionId,
        paidAt: item.paidAt,
        notes: item.notes,
        receiptImage: item.receiptImage || null,
        receiptUrl: item.receiptImage
            ? `${sharedVariable.address}${sharedVariable.subscriptionReceipts}${item.receiptImage}`
            : null,
        receiptUploadedAt: item.receiptUploadedAt || null,
        hasReceipt: Boolean(item.receiptImage),
        plan: item.subscriptionPlan
            ? {
                  id: item.subscriptionPlan.id,
                  name:
                      item.subscriptionPlan.getLocalizedName?.(lang) ||
                      item.subscriptionPlan.name?.[lang] ||
                      item.subscriptionPlan.name?.ar,
                  price: item.subscriptionPlan.price,
                  platform: item.subscriptionPlan.platform,
              }
            : null,
        createdAt: item.createdAt,
    }),

    country: (item, lang = 'ar') => ({
        id: item.id,
        name: item.getLocalizedName?.(lang) || item.nameAr,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        code: item.code,
        phoneCode: item.phoneCode || '',
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    paymentMethod: (item, lang = 'ar') => ({
        id: item.id,
        name: item.getLocalizedName?.(lang) || item.nameAr,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        code: item.code,
        affectsCashbox: Boolean(item.affectsCashbox),
        requiresCustomer: Boolean(item.requiresCustomer),
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }),

    appInstall: (item, lang = 'ar') => {
        const country = item.country;
        const geo = item.geoData || null;
        const loc = geo?.location || {};
        const locationParts = [loc.city, loc.region, loc.country || country?.name].filter(Boolean);
        const locationLabel = locationParts.join(' — ') || null;

        return {
            id: item.id,
            deviceId: item.deviceId,
            deviceType: item.deviceType,
            platform: item.platform,
            countryId: item.countryId || null,
            country: country
                ? {
                      id: country.id,
                      name: country.getLocalizedName?.(lang) || country.nameAr,
                      code: country.code,
                  }
                : loc.country
                  ? { name: loc.country, code: loc.countryCode || null }
                  : null,
            ipAddress: item.ipAddress || geo?.ip || '',
            geo: geo
                ? {
                      location: loc,
                      network: geo.network || null,
                      client: geo.client || null,
                      locationLabel,
                  }
                : null,
            appVersion: item.appVersion || '',
            deviceModel: item.deviceModel || '',
            osVersion: item.osVersion || '',
            linkedUserId: item.linkedUserId || null,
            linkedUserRef: item.linkedUserRef || null,
            isLinked: Boolean(item.linkedUserId),
            installedAt: item.installedAt,
            lastSeenAt: item.lastSeenAt,
            createdAt: item.createdAt,
        };
    },

    companySubscriber: (company, metrics = null, lang = 'ar') => {
        const mapSub = (s) => {
            const plan = s.subscriptionPlan;
            return {
                id: s.id,
                platform: s.platform,
                status: s.status,
                expiresAt: s.expiresAt,
                monthlyMrr: plan ? planToMonthlyMrr(plan.price, plan.billingCycle) : 0,
                plan: plan
                    ? {
                          id: plan.id,
                          name: plan.getLocalizedName?.(lang) || plan.name?.[lang] || plan.name?.ar,
                          price: plan.price,
                          billingCycle: plan.billingCycle,
                          maxBranches: plan.maxBranches,
                          maxDevices: plan.maxDevices,
                      }
                    : null,
            };
        };
        const subs = company.subscriptions || [];
        const pendingPayment = company.subscriptionPayments?.find((p) => p.status === 'pending');
        const hasActiveSub = subs.some((s) => s.status === 'active');
        const country = company.country;
        return {
            id: company.id,
            name: company.name,
            phone: company.phone,
            address: company.address,
            status: company.status,
            countryId: company.countryId || null,
            country: country
                ? {
                      id: country.id,
                      name: country.getLocalizedName?.(lang) || country.nameAr,
                      code: country.code,
                  }
                : null,
            needsPayment: company.status === 'pending' && !hasActiveSub,
            subscriptions: subs.map(mapSub),
            pendingPayment: pendingPayment
                ? {
                      id: pendingPayment.id,
                      platform: pendingPayment.platform,
                      amount: pendingPayment.amount,
                      merchantOrderId: pendingPayment.merchantOrderId,
                      receiptImage: pendingPayment.receiptImage || null,
                      receiptUrl: pendingPayment.receiptImage
                          ? `${sharedVariable.address}${sharedVariable.subscriptionReceipts}${pendingPayment.receiptImage}`
                          : null,
                      receiptUploadedAt: pendingPayment.receiptUploadedAt || null,
                      hasReceipt: Boolean(pendingPayment.receiptImage),
                      plan: pendingPayment.subscriptionPlan
                          ? {
                                name:
                                    pendingPayment.subscriptionPlan.getLocalizedName?.('ar') ||
                                    pendingPayment.subscriptionPlan.name?.ar,
                                price: pendingPayment.subscriptionPlan.price,
                            }
                          : null,
                  }
                : null,
            createdAt: company.createdAt,
            metrics: metrics
                ? {
                      branchCount: metrics.branchCount,
                      cashierCount: metrics.cashierCount,
                      activeDeviceCount: metrics.activeDeviceCount,
                      salesMonth: metrics.salesMonth,
                      salesMonthCount: metrics.salesMonthCount,
                      salesTotal: metrics.salesTotal,
                      subscriptionPaidTotal: metrics.subscriptionPaidTotal,
                      mrr: metrics.mrr,
                  }
                : null,
        };
    },

    subscriptionPlan: (item, lang = 'ar') => ({
        id: item.id,
        name: item.getLocalizedName?.(lang) || item.name?.ar,
        nameRaw: item.name,
        description:
            item.getLocalizedDescription?.(lang) ||
            item.description?.[lang] ||
            item.description?.ar ||
            '',
        descriptionRaw: item.description,
        platform: item.platform || 'desktop',
        deploymentTier: item.deploymentTier || 'online',
        billingCycle: item.billingCycle || 'monthly',
        price: item.price,
        durationDays: item.durationDays,
        maxProducts: item.maxProducts,
        maxDevices: item.maxDevices ?? 1,
        maxBranches: item.maxBranches ?? 1,
        storageLimitMb: item.storageLimitMb,
        features: item.features || [],
        isActive: item.isActive,
    }),
};

export default returnObject;
