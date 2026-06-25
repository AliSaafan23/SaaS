import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import {
    activateOfflineLicense,
    refreshOfflineLicense,
    getLicenseSchema,
    getBootstrapForLicense,
} from '../../helpers/api/license/licenseService.js';

const mapLicenseError = (res, err) => {
    const key = err.message || 'returnDeveloper';
    const known = [
        'cashierNotFound',
        'invalidEmailOrPassword',
        'accountNotActivated',
        'emailNotVerified',
        'branchNotFound',
        'companyNotActive',
        'subscriptionRequired',
        'wrongPlatformSubscription',
        'subscriptionExpired',
        'notOfflinePlan',
        'deviceLimitReached',
        'invalidLicense',
        'licenseRequired',
    ];

    if (known.includes(key)) {
        return errorHandler(res, 'fail', key);
    }

    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    schema: async (req, res) => {
        const data = getLicenseSchema();
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    activate: async (req, res) => {
        const { email, password, deviceId, deviceType, includeBootstrap } = matchedData(req);
        const platformHeader = req.headers['x-platform'] || req.body?.platform;

        try {
            const data = await activateOfflineLicense({
                email,
                password,
                deviceId,
                deviceType,
                platformHeader,
                includeBootstrap: Boolean(includeBootstrap),
            });

            res.send(new ApiResponse('success', i18n.__('licenseActivated'), 200, data));
        } catch (err) {
            return mapLicenseError(res, err);
        }
    },

    refresh: async (req, res) => {
        const authHeader = req.headers.authorization || '';
        const licenseToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        const { deviceId } = matchedData(req);

        if (!licenseToken) {
            return errorHandler(res, 'unauthorized', 'licenseRequired');
        }

        try {
            const data = await refreshOfflineLicense({ licenseToken, deviceId });
            res.send(new ApiResponse('success', i18n.__('licenseRefreshed'), 200, data));
        } catch (err) {
            return mapLicenseError(res, err);
        }
    },

    bootstrap: async (req, res) => {
        try {
            const data = await getBootstrapForLicense(req.offlineLicense);
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            return mapLicenseError(res, err);
        }
    },
};
