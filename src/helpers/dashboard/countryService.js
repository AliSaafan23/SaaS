import { Op } from 'sequelize';
import { Country } from '../../models/index.js';
import {
    resolveClientIp,
    getGeoFromRequest,
} from '../../utils/geo/locationDataFetcher.js';

export const listActiveCountries = async () =>
    Country.findAll({
        where: { isActive: true },
        order: [
            ['sortOrder', 'ASC'],
            ['nameAr', 'ASC'],
        ],
    });

export const findCountryById = async (id, { activeOnly = false } = {}) => {
    if (!id) return null;
    const where = { id };
    if (activeOnly) where.isActive = true;
    return Country.findOne({ where });
};

export const findCountryByCode = async (code) => {
    if (!code) return null;
    return Country.findOne({
        where: {
            code: String(code).trim().toUpperCase(),
            isActive: true,
        },
    });
};

const resolveClientIpFromReq = (req) => resolveClientIp(req);

/**
 * Resolve country priority:
 * 1) countryId from client
 * 2) countryCode from device locale (e.g. EG, SA)
 * 3) IP geolocation fallback
 */
export const resolveCountryId = async ({ countryId, countryCode, req, geo }) => {
    if (countryId) {
        const country = await findCountryById(countryId, { activeOnly: true });
        if (country) return country.id;
    }

    if (countryCode) {
        const byCode = await findCountryByCode(countryCode);
        if (byCode) return byCode.id;
    }

    if (!req && !geo) return null;

    const ipGeo = geo || (req ? (await getGeoFromRequest(req)).geo : null);
    if (ipGeo?.countryCode) {
        const byCode = await findCountryByCode(ipGeo.countryCode);
        if (byCode) return byCode.id;
    }

    if (ipGeo?.country) {
        const byName = await Country.findOne({
            where: {
                isActive: true,
                [Op.or]: [{ nameAr: ipGeo.country }, { nameEn: ipGeo.country }],
            },
        });
        if (byName) return byName.id;
    }

    return null;
};

export { resolveClientIpFromReq as resolveClientIp };

export const sanitizeCountryPayload = (body, { partial = false } = {}) => {
    const data = {};
    const set = (key, value) => {
        if (value !== undefined) data[key] = value;
    };

    if (!partial || body.nameAr !== undefined) {
        const nameAr = String(body.nameAr || '').trim();
        if (!nameAr) throw new Error('nameRequired');
        set('nameAr', nameAr);
    }

    if (!partial || body.nameEn !== undefined) {
        const nameEn = String(body.nameEn || body.nameAr || '').trim();
        if (!nameEn) throw new Error('nameRequired');
        set('nameEn', nameEn);
    }

    if (!partial || body.code !== undefined) {
        const code = String(body.code || '').trim().toUpperCase();
        if (!code || code.length < 2) throw new Error('countryCodeRequired');
        set('code', code);
    }

    if (!partial || body.phoneCode !== undefined) {
        set('phoneCode', String(body.phoneCode || '').trim());
    }

    if (!partial || body.sortOrder !== undefined) {
        const sortOrder = Number(body.sortOrder);
        set('sortOrder', Number.isFinite(sortOrder) ? sortOrder : 0);
    }

    if (!partial || body.isActive !== undefined) {
        set('isActive', body.isActive !== false && body.isActive !== 'false');
    }

    return data;
};

export default {
    listActiveCountries,
    findCountryById,
    findCountryByCode,
    resolveCountryId,
    sanitizeCountryPayload,
};
