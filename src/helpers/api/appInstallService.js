import { Op } from 'sequelize';
import { AppInstall, Country } from '../../models/index.js';
import { resolveCountryId } from '../dashboard/countryService.js';
import { normalizePlatform } from '../../config/subscriptionAccess.js';
import returnObject from '../dashboard/returnobject.js';
import {
    resolveClientIp,
    getGeoFromRequest,
    parseUserAgent,
} from '../../utils/geo/locationDataFetcher.js';

export { resolveClientIp };

const resolveInstallPlatform = ({ platformHeader, deviceType }) => {
    const dt = String(deviceType || '').toLowerCase();
    if (dt === 'web') return 'desktop';
    if (dt === 'android' || dt === 'ios') return 'mobile';
    return normalizePlatform(platformHeader);
};

const buildGeoPayload = async (req) => {
    const { ip, geo } = await getGeoFromRequest(req);
    const userAgent = parseUserAgent(req.headers['user-agent'] || '');

    return {
        ip: ip || geo?.ip || null,
        location: {
            country: geo?.country || null,
            countryCode: geo?.countryCode || null,
            region: geo?.region || null,
            city: geo?.city || null,
            postal: geo?.postal || null,
            latitude: geo?.latitude ?? null,
            longitude: geo?.longitude ?? null,
            timezone: geo?.timezone || null,
        },
        network: {
            isp: geo?.isp || null,
            asn: geo?.asn || null,
            network: geo?.network || null,
        },
        client: userAgent,
        resolvedAt: new Date().toISOString(),
    };
};

export const emitAppInstallEvent = (req, install, { isNew = false } = {}) => {
    if (!isNew || !install) return;

    const io = req.app?.get?.('io');
    if (!io) return;

    const lang = req.headers.lang === 'en' ? 'en' : 'ar';
    const payload = returnObject.appInstall(install, lang);

    io.to('admin').emit('appInstall', {
        ...payload,
        isNew: true,
    });
};

/**
 * Track first app open / install before login.
 * Same deviceId + deviceType → update lastSeen only (no duplicate, no socket).
 */
export const trackAppInstall = async (req, body) => {
    const deviceKey = String(body.deviceId || '').trim();
    const deviceType = String(body.deviceType || '').toLowerCase();

    if (!deviceKey || !deviceType) {
        throw new Error('deviceIdRequired');
    }

    const platform = resolveInstallPlatform({
        platformHeader: body.platform || req.headers['x-platform'],
        deviceType,
    });

    const now = new Date();
    const geoData = await buildGeoPayload(req);
    const ip = geoData.ip || resolveClientIp(req) || '';
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);

    const countryId = await resolveCountryId({
        countryId: body.countryId,
        countryCode: body.countryCode,
        geo: geoData.location,
    });

    const existing = await AppInstall.findOne({
        where: { deviceId: deviceKey, deviceType },
        include: [{ model: Country, as: 'country', required: false }],
    });

    if (existing) {
        await existing.update({
            lastSeenAt: now,
            platform,
            appVersion: body.appVersion?.trim() || existing.appVersion || '',
            deviceModel: body.deviceModel?.trim() || existing.deviceModel || '',
            osVersion: body.osVersion?.trim() || existing.osVersion || '',
            countryId: existing.countryId || countryId,
            ipAddress: ip || existing.ipAddress || '',
            userAgent: userAgent || existing.userAgent || '',
            geoData: geoData || existing.geoData,
        });
        await existing.reload({ include: [{ model: Country, as: 'country', required: false }] });
        return { install: existing, isNew: false };
    }

    const install = await AppInstall.create({
        deviceId: deviceKey,
        deviceType,
        platform,
        countryId,
        ipAddress: ip || '',
        userAgent,
        geoData,
        appVersion: body.appVersion?.trim() || '',
        deviceModel: body.deviceModel?.trim() || '',
        osVersion: body.osVersion?.trim() || '',
        installedAt: now,
        lastSeenAt: now,
    });

    await install.reload({ include: [{ model: Country, as: 'country', required: false }] });

    emitAppInstallEvent(req, install, { isNew: true });

    return { install, isNew: true };
};

/** Link pre-login install record when user signs in. */
export const linkAppInstallToUser = async ({ deviceId, deviceType, userId, userRef }) => {
    const deviceKey = String(deviceId || '').trim();
    const dt = String(deviceType || '').toLowerCase();

    if (!deviceKey || !dt || !userId || !userRef) return null;

    const install = await AppInstall.findOne({
        where: { deviceId: deviceKey, deviceType: dt },
    });

    if (!install) return null;

    await install.update({
        linkedUserId: userId,
        linkedUserRef: userRef,
        lastSeenAt: new Date(),
    });

    return install;
};

export const listAppInstalls = async (query = {}) => {
    const where = {};
    const limit = Math.min(Number(query.limit) || 100, 500);
    const offset = Math.max(Number(query.offset) || 0, 0);

    if (query.deviceType) where.deviceType = query.deviceType;
    if (query.platform) where.platform = query.platform;
    if (query.countryId) where.countryId = Number(query.countryId);

    if (query.linked === '1') {
        where.linkedUserId = { [Op.ne]: null };
    } else if (query.linked === '0') {
        where.linkedUserId = null;
    }

    if (query.search) {
        const term = `%${String(query.search).trim()}%`;
        where[Op.or] = [
            { deviceId: { [Op.like]: term } },
            { deviceModel: { [Op.like]: term } },
            { appVersion: { [Op.like]: term } },
            { ipAddress: { [Op.like]: term } },
        ];
    }

    const { rows, count } = await AppInstall.findAndCountAll({
        where,
        include: [{ model: Country, as: 'country', required: false }],
        order: [['installedAt', 'DESC']],
        limit,
        offset,
    });

    return { rows, count, limit, offset };
};

export const getAppInstallStats = async () => {
    const { sequelize } = AppInstall;

    const [total, unlinked, android, ios, desktop, countryRows] = await Promise.all([
        AppInstall.count(),
        AppInstall.count({ where: { linkedUserId: null } }),
        AppInstall.count({ where: { deviceType: 'android' } }),
        AppInstall.count({ where: { deviceType: 'ios' } }),
        AppInstall.count({ where: { platform: 'desktop' } }),
        sequelize.query(
            `SELECT ai.countryId, COUNT(ai.id) AS count,
                    c.nameAr, c.nameEn, c.code
             FROM tbl_app_installs ai
             LEFT JOIN tbl_countries c ON c.id = ai.countryId
             GROUP BY ai.countryId, c.nameAr, c.nameEn, c.code
             ORDER BY count DESC
             LIMIT 10`,
            { type: sequelize.QueryTypes.SELECT }
        ),
    ]);

    return {
        total,
        unlinked,
        android,
        ios,
        desktop,
        byCountry: countryRows.map((row) => ({
            countryId: row.countryId,
            count: Number(row.count),
            country: row.countryId
                ? {
                      id: row.countryId,
                      nameAr: row.nameAr,
                      nameEn: row.nameEn,
                      code: row.code,
                  }
                : null,
        })),
    };
};

export default {
    trackAppInstall,
    linkAppInstallToUser,
    listAppInstalls,
    getAppInstallStats,
    emitAppInstallEvent,
    resolveClientIp,
};
