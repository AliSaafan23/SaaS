import axios from 'axios';

const EMPTY_GEO = () => ({
    ip: null,
    country: null,
    countryCode: null,
    region: null,
    city: null,
    postal: null,
    latitude: null,
    longitude: null,
    timezone: null,
    currency: null,
    callingCode: null,
    isp: null,
    asn: null,
    network: null,
});

export const normalizeIp = (ip) => {
    if (!ip) return null;
    let value = String(ip).trim();
    if (value.startsWith('::ffff:')) value = value.slice(7);
    return value;
};

export const isPrivateOrLocalIp = (ip) => {
    const value = normalizeIp(ip);
    if (!value) return true;
    if (value === '::1' || value === '127.0.0.1' || value === 'localhost') return true;
    if (value.startsWith('10.') || value.startsWith('192.168.') || value.startsWith('169.254.')) {
        return true;
    }
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return true;
    return false;
};

/** Real client IP behind proxy / load balancer */
export const resolveClientIp = (req) => {
    if (!req) return null;

    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const first = String(forwarded).split(',')[0].trim();
        if (first) return normalizeIp(first);
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) return normalizeIp(realIp);

    return normalizeIp(req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress);
};

const mapIpApiResponse = (ip, data) => {
    if (!data || data.error) return { ...EMPTY_GEO(), ip };

    return {
        ip,
        country: data.country_name || null,
        countryCode: data.country_code || null,
        region: data.region || null,
        city: data.city || null,
        postal: data.postal || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        timezone: data.timezone || null,
        currency: data.currency || null,
        callingCode: data.country_calling_code || null,
        isp: data.org || null,
        asn: data.asn || null,
        network: data.network || null,
    };
};

/** Full geolocation from public IP (ipapi.co). */
export async function getLocationData(ip) {
    const normalized = normalizeIp(ip);
    if (!normalized || isPrivateOrLocalIp(normalized)) {
        return { ...EMPTY_GEO(), ip: normalized };
    }

    try {
        const response = await axios.get(`https://ipapi.co/${normalized}/json/`, {
            timeout: 5000,
            headers: { 'User-Agent': 'GoldPos/1.0' },
        });
        return mapIpApiResponse(normalized, response.data);
    } catch (error) {
        console.error('Error getting location data:', error.message);
        return { ...EMPTY_GEO(), ip: normalized };
    }
}

/** IP + geo bundle from Express request. */
export async function getGeoFromRequest(req) {
    const ip = resolveClientIp(req);
    const geo = await getLocationData(ip);
    return { ip, geo };
};

/** Basic hints from User-Agent (OS/browser) — device model still comes from the app. */
export function parseUserAgent(userAgent = '') {
    const ua = String(userAgent);
    const lower = ua.toLowerCase();

    let os = 'unknown';
    if (lower.includes('android')) os = 'Android';
    else if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) os = 'iOS';
    else if (lower.includes('windows')) os = 'Windows';
    else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
    else if (lower.includes('linux')) os = 'Linux';

    let browser = 'unknown';
    if (lower.includes('edg/')) browser = 'Edge';
    else if (lower.includes('chrome/')) browser = 'Chrome';
    else if (lower.includes('firefox/')) browser = 'Firefox';
    else if (lower.includes('safari/') && !lower.includes('chrome')) browser = 'Safari';

    let deviceClass = 'unknown';
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
        deviceClass = 'mobile';
    } else if (lower.includes('ipad') || lower.includes('tablet')) {
        deviceClass = 'tablet';
    } else if (os !== 'unknown') {
        deviceClass = 'desktop';
    }

    return {
        os,
        browser,
        deviceClass,
        raw: ua.slice(0, 500),
    };
}

export default getLocationData;
