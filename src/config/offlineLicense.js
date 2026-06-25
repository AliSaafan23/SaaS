export const OFFLINE_DTO_VERSION = 1;

export const OFFLINE_LICENSE_ENTITIES = [
    'category',
    'unit',
    'product',
    'customer',
    'supplier',
];

export const DEPLOYMENT_TIERS = ['offline', 'online'];

export const normalizeDeploymentTier = (value) => {
    const tier = String(value || 'online').toLowerCase();
    return tier === 'offline' ? 'offline' : 'online';
};

export const getOfflineLicenseGraceDays = () => {
    const raw = Number(process.env.OFFLINE_LICENSE_GRACE_DAYS);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 14;
};

export const getOfflineLicenseSecret = () =>
    process.env.OFFLINE_LICENSE_PRIVATE_KEY || process.env.JWT_SECRET || 'your-secret-key';

export default {
    OFFLINE_DTO_VERSION,
    OFFLINE_LICENSE_ENTITIES,
    DEPLOYMENT_TIERS,
    normalizeDeploymentTier,
    getOfflineLicenseGraceDays,
    getOfflineLicenseSecret,
};
