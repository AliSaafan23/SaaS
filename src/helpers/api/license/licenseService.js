import {
    Cashier,
    Branch,
    Company,
    OfflineLicenseActivation,
} from '../../../models/index.js';
import {
    findCashierByEmail,
} from '../cashierAuth.js';
import { registerCashierDevice } from '../deviceSession.js';
import {
    resolveCompanySubscriptionForLogin,
    buildEntitlements,
    getMaxDevicesForCashier,
} from '../../dashboard/subscriptionService.js';
import { evaluateSubscriptionAccess } from '../../dashboard/subscriptionGrace.js';
import { inferLoginPlatform } from '../../../config/subscriptionAccess.js';
import { normalizeDeploymentTier, getOfflineLicenseGraceDays } from '../../../config/offlineLicense.js';
import {
    signOfflineLicenseToken,
    verifyOfflineLicenseTokenAllowExpired,
    licenseSecondsUntilExpiry,
} from './licenseToken.js';
import licenseReturnObject from './licenseReturnObject.js';
import { buildLicenseBootstrapPayload } from './licenseBootstrap.js';

const loadCashierContext = async (cashierId) => {
    return Cashier.findByPk(cashierId, {
        include: [{
            model: Branch,
            as: 'branch',
            include: [{ model: Company, as: 'company' }],
        }],
    });
};

const assertOfflineSubscription = async (companyId, platform) => {
    const { sub, reason } = await resolveCompanySubscriptionForLogin(companyId, platform);

    if (!sub) {
        const err = new Error(reason === 'wrongPlatform' ? 'wrongPlatformSubscription' : 'subscriptionRequired');
        throw err;
    }

    const access = evaluateSubscriptionAccess(sub);
    if (!access.canUsePaidFeatures) {
        const err = new Error('subscriptionExpired');
        throw err;
    }

    const deploymentTier = normalizeDeploymentTier(sub.subscriptionPlan?.deploymentTier);
    if (deploymentTier !== 'offline') {
        const err = new Error('notOfflinePlan');
        throw err;
    }

    return { sub, deploymentTier, licenseExpiresAt: sub.expiresAt };
};

const countActiveOfflineDevices = async (cashierId, platform) =>
    OfflineLicenseActivation.count({
        where: {
            cashierId,
            platform,
            revoked: false,
        },
    });

const enforceOfflineDeviceLimit = async ({ cashierId, platform, deviceId, maxDevices }) => {
    const existing = await OfflineLicenseActivation.findOne({
        where: { cashierId, deviceId, revoked: false },
    });

    if (existing) {
        return existing;
    }

    const activeCount = await countActiveOfflineDevices(cashierId, platform);
    if (activeCount >= maxDevices) {
        const err = new Error('deviceLimitReached');
        throw err;
    }

    return null;
};

const upsertOfflineActivation = async ({
    cashierId,
    companyId,
    branchId,
    deviceId,
    platform,
    deviceType,
    licenseExpiresAt,
}) => {
    const now = new Date();
    const [record] = await OfflineLicenseActivation.findOrCreate({
        where: { cashierId, deviceId },
        defaults: {
            cashierId,
            companyId,
            branchId,
            deviceId,
            platform,
            deviceType: deviceType || '',
            licenseExpiresAt,
            activatedAt: now,
            lastRefreshAt: now,
            revoked: false,
        },
    });

    if (!record.isNewRecord) {
        await record.update({
            companyId,
            branchId,
            platform,
            deviceType: deviceType || record.deviceType || '',
            licenseExpiresAt,
            lastRefreshAt: now,
            revoked: false,
        });
    }

    return record;
};

const buildLicensePayload = async ({
    cashier,
    branch,
    company,
    platform,
    deploymentTier,
    licenseExpiresAt,
    deviceId,
    entitlements,
}) => {
    const graceDays = getOfflineLicenseGraceDays();
    const licenseToken = signOfflineLicenseToken(
        {
            sub: cashier.id,
            cashierId: cashier.id,
            companyId: company.id,
            branchId: branch.id,
            platform,
            deploymentTier,
            entitlements,
            licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt).toISOString() : null,
            deviceId,
        },
        licenseSecondsUntilExpiry(licenseExpiresAt)
    );

    return { licenseToken, graceDays };
};

export const getLicenseSchema = () => licenseReturnObject.schema();

export const activateOfflineLicense = async ({
    email,
    password,
    deviceId,
    deviceType,
    platformHeader,
    includeBootstrap = false,
}) => {
    const cashier = await findCashierByEmail(email);
    if (!cashier) {
        const err = new Error('cashierNotFound');
        throw err;
    }

    if (cashier.status !== 'active') {
        const err = new Error('accountNotActivated');
        throw err;
    }

    if (!cashier.active) {
        const err = new Error('emailNotVerified');
        throw err;
    }

    const passwordOk = await cashier.comparePassword(password);
    if (!passwordOk) {
        const err = new Error('invalidEmailOrPassword');
        throw err;
    }

    const cashierWithBranch = await loadCashierContext(cashier.id);
    const branch = cashierWithBranch?.branch;
    const company = branch?.company;

    if (!branch || branch.status !== 'active') {
        const err = new Error('branchNotFound');
        throw err;
    }

    if (!company || company.status !== 'active') {
        const err = new Error('companyNotActive');
        throw err;
    }

    const platform = inferLoginPlatform(platformHeader, deviceType) || 'desktop';
    const { sub, deploymentTier, licenseExpiresAt } = await assertOfflineSubscription(
        company.id,
        platform
    );

    const maxDevices = Math.max(1, Number(sub.subscriptionPlan?.maxDevices) || 1);
    await enforceOfflineDeviceLimit({
        cashierId: cashier.id,
        platform,
        deviceId,
        maxDevices,
    });

    await registerCashierDevice({
        cashierId: cashier.id,
        deviceId,
        deviceType,
        platform,
    });

    await upsertOfflineActivation({
        cashierId: cashier.id,
        companyId: company.id,
        branchId: branch.id,
        deviceId,
        platform,
        deviceType,
        licenseExpiresAt,
    });

    const entitlements = await buildEntitlements(cashier.id, platform);
    const { licenseToken, graceDays } = await buildLicensePayload({
        cashier,
        branch,
        company,
        platform,
        deploymentTier,
        licenseExpiresAt,
        deviceId,
        entitlements,
    });

    const response = licenseReturnObject.activation({
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
        bootstrapIncluded: false,
    });

    if (includeBootstrap) {
        response.bootstrap = await buildLicenseBootstrapPayload({
            companyId: company.id,
            branchId: branch.id,
        });
        response.bootstrapIncluded = true;
    }

    return response;
};

export const refreshOfflineLicense = async ({ licenseToken, deviceId }) => {
    let decoded;
    try {
        decoded = verifyOfflineLicenseTokenAllowExpired(licenseToken);
    } catch (err) {
        const licenseErr = new Error('invalidLicense');
        licenseErr.cause = err;
        throw licenseErr;
    }

    const cashierId = decoded.cashierId || decoded.sub;
    const platform = decoded.platform || 'desktop';
    const deviceKey = deviceId || decoded.deviceId;

    const cashierWithBranch = await loadCashierContext(cashierId);
    const cashier = cashierWithBranch;
    const branch = cashierWithBranch?.branch;
    const company = branch?.company;

    if (!cashier || cashier.status === 'delete' || cashier.status === 'block') {
        const err = new Error('cashierNotFound');
        throw err;
    }

    if (!branch || !company) {
        const err = new Error('branchNotFound');
        throw err;
    }

    const { deploymentTier, licenseExpiresAt } = await assertOfflineSubscription(company.id, platform);

    if (deviceKey) {
        await upsertOfflineActivation({
            cashierId: cashier.id,
            companyId: company.id,
            branchId: branch.id,
            deviceId: deviceKey,
            platform,
            deviceType: decoded.deviceType || '',
            licenseExpiresAt,
        });
    }

    const entitlements = await buildEntitlements(cashier.id, platform);
    const { licenseToken: newToken, graceDays } = await buildLicensePayload({
        cashier,
        branch,
        company,
        platform,
        deploymentTier,
        licenseExpiresAt,
        deviceId: deviceKey,
        entitlements,
    });

    return licenseReturnObject.refresh({
        licenseToken: newToken,
        licenseExpiresAt,
        graceDays,
        entitlements,
        deploymentTier,
        platform,
    });
};

export const getBootstrapForLicense = async (licensePayload) => {
    const companyId = licensePayload.companyId;
    const branchId = licensePayload.branchId;

    if (!companyId || !branchId) {
        const err = new Error('invalidLicense');
        throw err;
    }

    return buildLicenseBootstrapPayload({ companyId, branchId });
};

export default {
    getLicenseSchema,
    activateOfflineLicense,
    refreshOfflineLicense,
    getBootstrapForLicense,
};
