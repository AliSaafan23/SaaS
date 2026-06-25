import i18n from 'i18n';
import { Op } from 'sequelize';
import { Cashier, UserToken, Branch, Company } from '../../models/index.js';
import { errorHandler } from '../index.js';
import generateToken from './token.js';
import returnObject from '../merchant/returnobject.js';
import { ApiResponse } from '../../utils/index.js';
import { buildCashierAccessPayload, resolveCompanySubscriptionForLogin } from '../dashboard/subscriptionService.js';
import { inferLoginPlatform } from '../../config/subscriptionAccess.js';
import { prepareCashierDeviceSession } from './deviceSession.js';
import { linkAppInstallToUser } from './appInstallService.js';
import uploadFiles from '../../utils/common/uploadFiles.js';
import makeDir from '../../utils/common/makeDir.js';
import {
    sendResetCode,
    sendActivationCode,
    generateVerificationCode,
    getCodeExpiryDate,
} from '../../services/mailService.js';

const normalizeEmail = (email) => email?.trim().toLowerCase();

export const saveCashierAvatar = async (req) => {
    if (!req.files?.avatar) return 'default.jpg';
    makeDir('users');
    return uploadFiles.handleUploadAnyImage(req, 'users', 'avatar');
};

export const findCashierByEmail = async (email) => {
    return Cashier.scope('withPassword').findOne({
        where: {
            email: normalizeEmail(email),
            status: { [Op.ne]: 'delete' },
        },
    });
};

export const validateCashier = (cashier, res) => {
    if (!cashier) {
        return errorHandler(res, 'notFound', 'cashierNotFound');
    }
    if (cashier.status === 'delete') {
        return errorHandler(res, 'notFound', 'cashierNotFound');
    }
    if (cashier.status === 'block') {
        return errorHandler(res, 'blocked', 'accountStop');
    }
    return true;
};

export const validateCashierPassword = async (cashier, password, res) => {
    const isMatch = await cashier.comparePassword(password);
    if (!isMatch) {
        return errorHandler(res, 'fail', 'invalidEmailOrPassword');
    }
    return true;
};

export const validateCashierActive = (cashier, res) => {
    if (!cashier.active) {
        return errorHandler(res, 'fail', 'emailNotVerified');
    }
    return true;
};

export const handleUnverifiedCashierLogin = async (cashier, res, lang = 'ar') => {
    try {
        await issueActivationCode(cashier, lang);
        const payload = {
            needsEmailVerification: true,
            email: cashier.email,
        };

        return res.send(
            new ApiResponse('needsVerification', i18n.__('activationCodeSent'), 200, payload)
        );
    } catch (err) {
        console.error('handleUnverifiedCashierLogin error:', err);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export const handleCashierLogin = async (
    cashier,
    { fcmToken, deviceType, deviceId, platform },
    res
) => {
    const requestedPlatform = inferLoginPlatform(platform, deviceType);

    const cashierWithBranch = await Cashier.findByPk(cashier.id, {
        include: [{ model: Branch, as: 'branch', include: [{ model: Company, as: 'company' }] }],
    });
    const branch = cashierWithBranch?.branch;
    const company = branch?.company;
    const companyId = branch?.companyId;

    if (!branch || branch.status !== 'active') {
        return errorHandler(res, 'fail', 'branchNotFound');
    }

    if (!companyId || !company) {
        return errorHandler(res, 'fail', 'subscriptionRequired');
    }

    if (company.status !== 'active') {
        return errorHandler(res, 'fail', 'companyNotActive');
    }

    const { sub, platform: resolvedPlatform, reason } = await resolveCompanySubscriptionForLogin(
        companyId,
        requestedPlatform
    );

    if (!sub || !resolvedPlatform) {
        if (reason === 'wrongPlatform' || reason === 'platformRequired') {
            return errorHandler(res, 'fail', 'wrongPlatformSubscription');
        }
        return errorHandler(res, 'fail', 'subscriptionRequired');
    }

    const normalizedPlatform = resolvedPlatform;

    const session = await prepareCashierDeviceSession({
        cashierId: cashier.id,
        platform: normalizedPlatform,
        deviceId,
        fcmToken,
        deviceType,
    });

    await linkAppInstallToUser({
        deviceId,
        deviceType,
        userId: cashier.id,
        userRef: 'Cashier',
    });

    const token = await generateToken(cashier.id, 'cashier', 'Cashier', {
        deviceId: session.deviceId,
        platform: session.platform,
    });
    const access = await buildCashierAccessPayload(cashier, normalizedPlatform);

    const data = returnObject.cashierLoginSummary(
        cashier,
        token,
        access,
        normalizedPlatform,
        branch,
        company
    );

    return res.send(
        new ApiResponse('success', i18n.__('loginSuccessful'), 200, data)
    );
};

export const handleCashierLogout = async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (token) {
        await UserToken.update(
            { expired: true },
            { where: { token, userRef: 'Cashier' } }
        );
    }

    return res.send(
        new ApiResponse('success', i18n.__('logoutSuccessful'), 200, {})
    );
};

export const expireCashierTokens = async (cashierId) => {
    await UserToken.update(
        { expired: true },
        { where: { userId: cashierId, userRef: 'Cashier' } }
    );
};

export const issueActivationCode = async (cashier, lang = 'ar') => {
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryDate();

    await cashier.update({
        activationCode: code,
        activationCodeExpiresAt: expiresAt,
    });

    await sendActivationCode(cashier.email, code, lang);
    return code;
};

export const verifyActivationCode = (cashier, code, res) => {
    if (!cashier.activationCode || cashier.activationCode !== code) {
        return errorHandler(res, 'fail', 'invalidVerificationCode');
    }
    if (!cashier.activationCodeExpiresAt || cashier.activationCodeExpiresAt < new Date()) {
        return errorHandler(res, 'fail', 'verificationCodeExpired');
    }
    return true;
};

export const confirmEmailVerification = async (cashier) => {
    await cashier.update({
        active: true,
        activationCode: null,
        activationCodeExpiresAt: null,
    });
};

export const issueResetCode = async (cashier, lang = 'ar') => {
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryDate();

    await cashier.update({
        resetCode: code,
        resetCodeExpiresAt: expiresAt,
    });

    await sendResetCode(cashier.email, code, lang);
    return code;
};

export const verifyResetCode = (cashier, code, res) => {
    if (!cashier.resetCode || cashier.resetCode !== code) {
        return errorHandler(res, 'fail', 'invalidVerificationCode');
    }
    if (!cashier.resetCodeExpiresAt || cashier.resetCodeExpiresAt < new Date()) {
        return errorHandler(res, 'fail', 'verificationCodeExpired');
    }
    return true;
};

export default {
    findCashierByEmail,
    validateCashier,
    validateCashierPassword,
    validateCashierActive,
    saveCashierAvatar,
    handleCashierLogin,
    handleCashierLogout,
    expireCashierTokens,
    issueActivationCode,
    verifyActivationCode,
    confirmEmailVerification,
    issueResetCode,
    verifyResetCode,
    handleUnverifiedCashierLogin,
};

