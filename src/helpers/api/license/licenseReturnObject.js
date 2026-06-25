import { OFFLINE_DTO_VERSION } from '../../../config/offlineLicense.js';

const licenseReturnObject = {
    schema: () => ({
        dtoVersion: OFFLINE_DTO_VERSION,
        entities: ['category', 'unit', 'product', 'customer', 'supplier'],
        deploymentModes: ['offline', 'online'],
    }),

    activation: ({
        cashier,
        branch,
        company,
        platform,
        entitlements,
        deploymentTier,
        licenseToken,
        licenseExpiresAt,
        graceDays,
        deviceId,
        bootstrapIncluded = false,
    }) => ({
        deploymentTier,
        selectedPlatform: platform,
        license: {
            token: licenseToken,
            expiresAt: licenseExpiresAt,
            graceDays,
            dtoVersion: OFFLINE_DTO_VERSION,
            deviceId,
        },
        offlineLicense: {
            required: true,
            expiresAt: licenseExpiresAt,
            graceDays,
        },
        store: {
            enabled: false,
        },
        cashier: {
            id: cashier.id,
            name: cashier.name,
            email: cashier.email,
            branchId: branch?.id || null,
            branchName: branch?.name || null,
            companyId: company?.id || null,
            companyName: company?.name || null,
        },
        entitlements,
        canUsePaidFeatures: true,
        bootstrapIncluded,
    }),

    refresh: ({ licenseToken, licenseExpiresAt, graceDays, entitlements, deploymentTier, platform }) => ({
        deploymentTier,
        selectedPlatform: platform,
        license: {
            token: licenseToken,
            expiresAt: licenseExpiresAt,
            graceDays,
            dtoVersion: OFFLINE_DTO_VERSION,
        },
        offlineLicense: {
            required: true,
            expiresAt: licenseExpiresAt,
            graceDays,
        },
        entitlements,
        canUsePaidFeatures: true,
    }),
};

export default licenseReturnObject;
