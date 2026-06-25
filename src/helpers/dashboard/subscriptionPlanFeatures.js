import subscriptionFeatures, {
    DEFAULT_FREE_ACCESS_FEATURES,
    PLAN_FEATURE_PRESETS,
    FEATURE_GROUP_META,
    getPaidFeatureKeys,
    getFeaturesByGroup,
} from '../../config/subscriptionFeatures.js';
import { SystemSetting } from '../../models/index.js';
import { normalizeDeploymentTier } from '../../config/offlineLicense.js';

export const getFreeFeatureKeys = async () => {
    const row = await SystemSetting.findOne({ where: { settingKey: 'subscription' } });
    return row?.settingValue?.freeAccessFeatures || DEFAULT_FREE_ACCESS_FEATURES;
};

export const getFeatureCatalogPayload = async () => {
    const freeKeys = await getFreeFeatureKeys();
    return {
        featuresCatalog: subscriptionFeatures,
        freeFeatureKeys: freeKeys,
        paidFeatureKeys: getPaidFeatureKeys(freeKeys),
        featureGroups: getFeaturesByGroup(freeKeys),
        featureGroupMeta: FEATURE_GROUP_META,
        planFeaturePresets: PLAN_FEATURE_PRESETS,
    };
};

export const normalizePlanPlatform = (platform) => {
    if (!platform) return null;
    const p = String(platform).toLowerCase();
    if (p === 'android') return 'mobile';
    return p === 'mobile' ? 'mobile' : p === 'desktop' ? 'desktop' : null;
};

export const sanitizePlanFeatures = async (features) => {
    if (!Array.isArray(features)) return [];
    if (features.length === 1 && features[0] === 'all') return ['all'];

    const { paidFeatureKeys } = await getFeatureCatalogPayload();
    const allowed = new Set(paidFeatureKeys);
    const filtered = features.filter((k) => allowed.has(k));

    if (filtered.length && filtered.length === paidFeatureKeys.length) return ['all'];
    return filtered;
};

export const sanitizePlanPayload = async (data, { partial = false } = {}) => {
    const out = {};

    if (!partial || data.name !== undefined) {
        const name = data.name || {};
        const ar = String(name.ar || '').trim();
        if (!ar) throw new Error('nameRequired');
        out.name = { ar, en: String(name.en || ar).trim() };
    }

    if (!partial || data.description !== undefined) {
        const desc = data.description || {};
        out.description = {
            ar: String(desc.ar || '').trim(),
            en: String(desc.en || desc.ar || '').trim(),
        };
    }

    if (!partial || data.platform !== undefined) {
        const platform = normalizePlanPlatform(data.platform) || 'desktop';
        out.platform = platform;
    }

    if (!partial || data.deploymentTier !== undefined) {
        out.deploymentTier = normalizeDeploymentTier(data.deploymentTier || 'online');
    }

    if (!partial && out.deploymentTier === undefined) {
        out.deploymentTier = 'online';
    }

    if (!partial || data.billingCycle !== undefined) {
        const cycle = data.billingCycle || 'monthly';
        if (!['monthly', 'annual', 'lifetime'].includes(cycle)) throw new Error('invalidBillingCycle');
        out.billingCycle = cycle;
    }

    if (!partial || data.price !== undefined) {
        const price = Number(data.price);
        if (Number.isNaN(price) || price < 0) throw new Error('invalidPrice');
        out.price = price;
    }

    if (!partial || data.durationDays !== undefined) {
        if (data.durationDays !== undefined && data.durationDays !== '') {
            const durationDays = Number(data.durationDays);
            if (Number.isNaN(durationDays) || durationDays < 1) throw new Error('invalidDuration');
            out.durationDays = durationDays;
        } else if (!partial) {
            const cycle = out.billingCycle || data.billingCycle || 'monthly';
            out.durationDays = cycle === 'annual' ? 365 : cycle === 'lifetime' ? 36500 : 30;
        }
    }

    const intDefaults = {
        maxProducts: 500,
        maxDevices: 1,
        maxBranches: 1,
        storageLimitMb: 1024,
    };

    for (const [key, defaultVal] of Object.entries(intDefaults)) {
        if (partial && data[key] === undefined) continue;
        const raw = data[key] !== undefined && data[key] !== '' ? data[key] : defaultVal;
        const n = Number(raw);
        if (Number.isNaN(n) || n < 1) throw new Error('invalidLimit');
        out[key] = Math.floor(n);
    }

    if (!partial || data.features !== undefined) {
        out.features = await sanitizePlanFeatures(data.features || []);
    }

    if (!partial || data.isActive !== undefined) {
        out.isActive = data.isActive !== false;
    }

    return out;
};
