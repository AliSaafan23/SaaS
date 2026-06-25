import { errorHandler } from '../../helpers/index.js';
import { verifyOfflineLicenseTokenAllowExpired } from '../../helpers/api/license/licenseToken.js';

export const requireOfflineLicense = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
        return errorHandler(res, 'unauthorized', 'licenseRequired');
    }

    try {
        const payload = verifyOfflineLicenseTokenAllowExpired(token);
        req.offlineLicense = payload;
        return next();
    } catch (err) {
        console.error('requireOfflineLicense error:', err.message);
        return errorHandler(res, 'unauthorized', 'invalidLicense');
    }
};

export default { requireOfflineLicense };
