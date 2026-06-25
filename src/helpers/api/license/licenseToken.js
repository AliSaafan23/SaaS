import jwt from 'jsonwebtoken';
import {
    OFFLINE_DTO_VERSION,
    getOfflineLicenseGraceDays,
    getOfflineLicenseSecret,
} from '../../../config/offlineLicense.js';

const LICENSE_TYPE = 'offline_license';

export const signOfflineLicenseToken = (payload, expiresInSeconds = null) => {
    const secret = getOfflineLicenseSecret();
    const body = {
        type: LICENSE_TYPE,
        dtoVersion: OFFLINE_DTO_VERSION,
        graceDays: getOfflineLicenseGraceDays(),
        ...payload,
    };

    const options = {};
    if (expiresInSeconds && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
        options.expiresIn = expiresInSeconds;
    }

    return jwt.sign(body, secret, options);
};

const assertLicenseType = (decoded) => {
    if (decoded?.type !== LICENSE_TYPE) {
        const err = new Error('invalidLicenseType');
        err.code = 'invalidLicenseType';
        throw err;
    }
    return decoded;
};

export const verifyOfflineLicenseToken = (token) => {
    const secret = getOfflineLicenseSecret();
    const decoded = jwt.verify(token, secret);
    return assertLicenseType(decoded);
};

export const verifyOfflineLicenseTokenAllowExpired = (token) => {
    const secret = getOfflineLicenseSecret();
    const decoded = jwt.verify(token, secret, { ignoreExpiration: true });
    return assertLicenseType(decoded);
};

export const decodeOfflineLicenseToken = (token) => {
    try {
        return verifyOfflineLicenseToken(token);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return jwt.decode(token);
        }
        throw err;
    }
};

export const licenseSecondsUntilExpiry = (expiresAt) => {
    if (!expiresAt) return 365 * 86400;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(3600, Math.floor(ms / 1000));
};

export default {
    signOfflineLicenseToken,
    verifyOfflineLicenseToken,
    decodeOfflineLicenseToken,
    licenseSecondsUntilExpiry,
};
