import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import { Cashier, Branch, Company } from '../../models/index.js';
import returnObject from '../../helpers/merchant/returnobject.js';
import dashboardReturnObject from '../../helpers/dashboard/returnobject.js';
import {
    findCashierByEmail,
    validateCashier,
    validateCashierPassword,
    handleCashierLogin,
    handleCashierLogout,
    handleUnverifiedCashierLogin,
    issueActivationCode,
    verifyActivationCode,
    confirmEmailVerification,
    issueResetCode,
    verifyResetCode,
} from '../../helpers/api/cashierAuth.js';
import { buildCashierAccessPayload } from '../../helpers/dashboard/subscriptionService.js';
import { resolveCashierPlatform } from '../../helpers/api/cashierPlatform.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

export default {
    /**
     * Cashier self-registration is disabled — accounts are created by the merchant from the portal.
     */
    signupDisabled: (req, res) => {
        return errorHandler(res, 'fail', 'cashierSignupDisabled');
    },

    signin: async (req, res) => {
        const { email, password, fcmToken, deviceType, deviceId } = matchedData(req);

        const cashier = await findCashierByEmail(email);

        const valid = validateCashier(cashier, res);
        if (valid !== true) return;

        if (cashier.status !== 'active') {
            return errorHandler(res, 'fail', 'accountNotActivated');
        }

        const passwordValid = await validateCashierPassword(cashier, password, res);
        if (passwordValid !== true) return;

        if (!cashier.active) {
            return handleUnverifiedCashierLogin(cashier, res, lang(req));
        }

        await handleCashierLogin(cashier, {
            fcmToken,
            deviceType,
            deviceId,
            platform: req.headers['x-platform'] || req.body?.platform,
        }, res);
    },

    verifyEmail: async (req, res) => {
        const { email, code } = matchedData(req);

        const cashier = await findCashierByEmail(email);
        if (!cashier || cashier.status === 'delete') {
            return errorHandler(res, 'notFound', 'cashierNotFound');
        }

        if (cashier.status !== 'active') {
            return errorHandler(res, 'fail', 'accountNotActivated');
        }

        if (cashier.active) {
            return res.send(new ApiResponse('success', i18n.__('emailAlreadyVerified'), 200, {}));
        }

        const codeValid = verifyActivationCode(cashier, code, res);
        if (codeValid !== true) return;

        await confirmEmailVerification(cashier);

        res.send(new ApiResponse('success', i18n.__('emailActivated'), 200, {
            email: cashier.email,
            canLogin: true,
        }));
    },

    resendActivation: async (req, res) => {
        const { email } = matchedData(req);

        const cashier = await findCashierByEmail(email);
        if (!cashier || cashier.status === 'delete') {
            return errorHandler(res, 'notFound', 'cashierNotFound');
        }

        if (cashier.status !== 'active') {
            return errorHandler(res, 'fail', 'accountNotActivated');
        }

        if (cashier.active) {
            return res.send(new ApiResponse('success', i18n.__('emailAlreadyVerified'), 200, {}));
        }

        await issueActivationCode(cashier, lang(req));

        res.send(new ApiResponse('success', i18n.__('activationCodeSent'), 200, {
            email: cashier.email,
        }));
    },

    forgotPassword: async (req, res) => {
        const { email } = matchedData(req);

        const cashier = await findCashierByEmail(email);
        if (!cashier || cashier.status === 'delete') {
            return errorHandler(res, 'notFound', 'cashierNotFound');
        }

        if (cashier.status !== 'active') {
            return errorHandler(res, 'fail', 'accountNotActivated');
        }

        await issueResetCode(cashier, lang(req));

        res.send(new ApiResponse('success', i18n.__('resetCodeSent'), 200, {}));
    },

    resetPassword: async (req, res) => {
        const { email, code, password } = matchedData(req);

        const cashier = await findCashierByEmail(email);
        if (!cashier || cashier.status === 'delete') {
            return errorHandler(res, 'notFound', 'cashierNotFound');
        }

        const codeValid = verifyResetCode(cashier, code, res);
        if (codeValid !== true) return;

        await cashier.update({
            password,
            resetCode: null,
            resetCodeExpiresAt: null,
        });

        res.send(new ApiResponse('success', i18n.__('passwordResetSuccessful'), 200, {}));
    },

    profile: async (req, res) => {
        const cashier = req.cashier || req.user;
        const platform = await resolveCashierPlatform(req, cashier.id);
        const access = await buildCashierAccessPayload(cashier, platform);

        const cashierWithRelations = await Cashier.findByPk(cashier.id, {
            include: [{
                model: Branch,
                as: 'branch',
                include: [{ model: Company, as: 'company' }],
            }],
        });
        const branch = cashierWithRelations?.branch;
        const company = branch?.company;

        const data = {
            ...returnObject.cashierProfile(cashier, ''),
            branchId: branch?.id || null,
            branchName: branch?.name || null,
            companyId: company?.id || null,
            companyName: company?.name || null,
            companyStatus: company?.status || null,
            hasActiveSubscription: access.hasActiveSubscription,
            companySubscriptions: access.companySubscriptions.map((s) =>
                returnObject.companySubscription(s, lang(req))
            ),
            pendingPayment: access.pendingPayment
                ? dashboardReturnObject.subscriptionPayment(access.pendingPayment, lang(req))
                : null,
            entitlements: access.entitlements,
            freeFeatures: access.freeFeatures,
            canUsePaidFeatures: access.canUsePaidFeatures,
            subscriptionGrace: access.subscriptionGrace ?? false,
            subscriptionGraceDaysLeft: access.subscriptionGraceDaysLeft ?? null,
            selectedPlatform: access.selectedPlatform,
            deploymentTier: access.deploymentTier || 'online',
            offlineLicense: access.offlineLicense || { required: false, expiresAt: null, graceDays: 0 },
            store: access.store || { enabled: false },
            maxDevices: access.maxDevices,
            activeDeviceCount: access.activeDeviceCount,
        };
        res.send(new ApiResponse('success', i18n.__('profileFetched'), 200, data));
    },

    logout: async (req, res) => {
        await handleCashierLogout(req, res);
    },
};