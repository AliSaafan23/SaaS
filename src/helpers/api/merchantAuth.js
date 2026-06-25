import i18n from 'i18n';
import { Op } from 'sequelize';
import { Merchant, Company, UserToken } from '../../models/index.js';
import { errorHandler } from '../index.js';
import generateToken from './token.js';
import { ApiResponse } from '../../utils/index.js';
import {
    sendResetCode,
    sendActivationCode,
    generateVerificationCode,
    getCodeExpiryDate,
} from '../../services/mailService.js';
import { linkAppInstallToUser } from './appInstallService.js';

const normalizeEmail = (email) => email?.trim().toLowerCase();

export const findMerchantByEmail = async (email) => {
    return Merchant.scope('withPassword').findOne({
        where: {
            email: normalizeEmail(email),
            status: { [Op.ne]: 'delete' },
        },
    });
};

export const validateMerchant = (merchant, res) => {
    if (!merchant) {
        return errorHandler(res, 'notFound', 'merchantNotFound');
    }
    if (merchant.status === 'delete') {
        return errorHandler(res, 'notFound', 'merchantNotFound');
    }
    if (merchant.status === 'block') {
        return errorHandler(res, 'blocked', 'accountStop');
    }
    return true;
};

export const validateMerchantPassword = async (merchant, password, res) => {
    const isMatch = await merchant.comparePassword(password);
    if (!isMatch) {
        return errorHandler(res, 'fail', 'invalidEmailOrPassword');
    }
    return true;
};

export const handleMerchantLogin = async (merchant, res, { deviceId, deviceType } = {}) => {
    const token = await generateToken(merchant.id, 'merchant', 'Merchant');

    if (deviceId && deviceType) {
        await linkAppInstallToUser({
            deviceId,
            deviceType,
            userId: merchant.id,
            userRef: 'Merchant',
        });
    }

    const company = await Company.findByPk(merchant.companyId);

    const data = {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        avatar: merchant.avatar,
        language: merchant.language,
        company: company
            ? {
                  id: company.id,
                  name: company.name,
                  status: company.status,
                  logo: company.logo,
              }
            : null,
        token,
    };

    return res.send(
        new ApiResponse('success', i18n.__('loginSuccessful'), 200, data)
    );
};

export const handleMerchantLogout = async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (token) {
        await UserToken.update(
            { expired: true },
            { where: { token, userRef: 'Merchant' } }
        );
    }

    return res.send(
        new ApiResponse('success', i18n.__('logoutSuccessful'), 200, {})
    );
};

/** Unverified account: resend activation code and signal client to open verify page */
export const handleUnverifiedMerchantLogin = async (merchant, res, lang = 'ar') => {
    try {
        const activationCode = await issueMerchantActivationCode(merchant, lang);
        const email = merchant.email;
        const payload = {
            needsEmailVerification: true,
            email,
            redirect: `/merchant/verify-email?email=${encodeURIComponent(email)}&resent=1`,
        };

        if (process.env.TESTING === 'true' && activationCode) {
            payload.activationCode = activationCode;
        }

        return res.send(
            new ApiResponse('needsVerification', i18n.__('activationCodeSent'), 200, payload)
        );
    } catch (err) {
        console.warn('Resend activation on login failed:', err.message);
        return errorHandler(res, 'fail', 'emailSendFailed');
    }
};

export const issueMerchantActivationCode = async (merchant, lang = 'ar') => {
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryDate();

    await merchant.update({
        activationCode: code,
        activationCodeExpiresAt: expiresAt,
    });

    await sendActivationCode(merchant.email, code, lang);
    return code;
};

export const verifyMerchantActivationCode = (merchant, code, res) => {
    if (!merchant.activationCode || merchant.activationCode !== code) {
        return errorHandler(res, 'fail', 'invalidVerificationCode');
    }
    if (!merchant.activationCodeExpiresAt || merchant.activationCodeExpiresAt < new Date()) {
        return errorHandler(res, 'fail', 'verificationCodeExpired');
    }
    return true;
};

export const confirmMerchantEmailVerification = async (merchant) => {
    await merchant.update({
        active: true,
        status: 'active',
        activationCode: null,
        activationCodeExpiresAt: null,
    });
};

export const issueMerchantResetCode = async (merchant, lang = 'ar') => {
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryDate();

    await merchant.update({
        resetCode: code,
        resetCodeExpiresAt: expiresAt,
    });

    await sendResetCode(merchant.email, code, lang);
    return code;
};

export const verifyMerchantResetCode = (merchant, code, res) => {
    if (!merchant.resetCode || merchant.resetCode !== code) {
        return errorHandler(res, 'fail', 'invalidVerificationCode');
    }
    if (!merchant.resetCodeExpiresAt || merchant.resetCodeExpiresAt < new Date()) {
        return errorHandler(res, 'fail', 'verificationCodeExpired');
    }
    return true;
};

export default {
    findMerchantByEmail,
    validateMerchant,
    validateMerchantPassword,
    handleMerchantLogin,
    handleMerchantLogout,
    handleUnverifiedMerchantLogin,
    issueMerchantActivationCode,
    verifyMerchantActivationCode,
    confirmMerchantEmailVerification,
    issueMerchantResetCode,
    verifyMerchantResetCode,
};
