import { Op } from 'sequelize';
import { Device, UserToken } from '../../models/index.js';
import { getMaxDevicesForCashier } from '../dashboard/subscriptionService.js';
import { normalizePlatform } from '../../config/subscriptionAccess.js';

const upsertDeviceRecord = async ({ userId, userRef, deviceId, fcmToken, deviceType, platform }) => {
    if (!deviceId || !deviceType) return;

    const token = fcmToken?.trim() || '';

    const existing = await Device.findOne({
        where: { userId, userRef, deviceId },
    });

    if (existing) {
        await existing.update({
            fcmToken: token || existing.fcmToken || '',
            deviceType,
            platform,
        });
        return existing;
    }

    return Device.create({ userId, userRef, deviceId, fcmToken: token, deviceType, platform });
};

/**
 * Enforce plan maxDevices per platform before issuing a new JWT.
 * - Same deviceId: refresh session (expire old token for that device only)
 * - New device when at limit: expire oldest active session on same platform
 */
export const prepareCashierDeviceSession = async ({
    cashierId,
    platform,
    deviceId,
    fcmToken,
    deviceType,
}) => {
    const normalizedPlatform = normalizePlatform(platform);
    const maxDevices = await getMaxDevicesForCashier(cashierId, normalizedPlatform);
    const deviceKey = deviceId?.trim() || null;

    const activeWhere = {
        userId: cashierId,
        userRef: 'Cashier',
        expired: false,
        platform: normalizedPlatform,
    };

    let activeTokens = await UserToken.findAll({
        where: activeWhere,
        order: [['updatedAt', 'ASC']],
    });

    if (!deviceKey) {
        await UserToken.update({ expired: true }, { where: activeWhere });
        if (fcmToken && deviceType) {
            await Device.create({
                userId: cashierId,
                userRef: 'Cashier',
                fcmToken,
                deviceType,
                platform: normalizedPlatform,
            });
        }
        return { maxDevices, activeDevices: 1, platform: normalizedPlatform, deviceId: null };
    }

    const sameDeviceTokens = activeTokens.filter((t) => t.deviceId === deviceKey);
    if (sameDeviceTokens.length) {
        await UserToken.update(
            { expired: true },
            { where: { id: sameDeviceTokens.map((t) => t.id) } }
        );
        activeTokens = activeTokens.filter((t) => !sameDeviceTokens.some((s) => s.id === t.id));
    }

    while (activeTokens.length >= maxDevices) {
        const oldest = activeTokens.shift();
        if (oldest) {
            await UserToken.update({ expired: true }, { where: { id: oldest.id } });
        }
    }

    await upsertDeviceRecord({
        userId: cashierId,
        userRef: 'Cashier',
        deviceId: deviceKey,
        fcmToken,
        deviceType,
        platform: normalizedPlatform,
    });

    return {
        maxDevices,
        activeDevices: activeTokens.length + 1,
        platform: normalizedPlatform,
        deviceId: deviceKey,
    };
};

/** Register device on signup (before first login / JWT). */
export const registerCashierDevice = async ({
    cashierId,
    deviceId,
    fcmToken,
    deviceType,
    platform,
}) => {
    const deviceKey = deviceId?.trim();
    if (!deviceKey || !deviceType) return null;

    return upsertDeviceRecord({
        userId: cashierId,
        userRef: 'Cashier',
        deviceId: deviceKey,
        fcmToken: fcmToken?.trim() || '',
        deviceType,
        platform: normalizePlatform(platform),
    });
};

export const countActiveCashierDevices = async (cashierId, platform) => {
    const normalizedPlatform = normalizePlatform(platform);
    return UserToken.count({
        where: {
            userId: cashierId,
            userRef: 'Cashier',
            expired: false,
            platform: normalizedPlatform,
        },
    });
};

export const expireCashierPlatformSessions = async (cashierId, platform) => {
    await UserToken.update(
        { expired: true },
        {
            where: {
                userId: cashierId,
                userRef: 'Cashier',
                platform: normalizePlatform(platform),
                expired: false,
            },
        }
    );
};

export default {
    prepareCashierDeviceSession,
    registerCashierDevice,
    countActiveCashierDevices,
    expireCashierPlatformSessions,
};
