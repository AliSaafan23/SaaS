import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import { Merchant, Company } from '../../models/index.js';
import {
    findMerchantByEmail,
    validateMerchant,
    validateMerchantPassword,
    handleMerchantLogin,
    handleMerchantLogout,
    issueMerchantActivationCode,
    verifyMerchantActivationCode,
    confirmMerchantEmailVerification,
    issueMerchantResetCode,
    verifyMerchantResetCode,
    handleUnverifiedMerchantLogin,
} from '../../helpers/api/merchantAuth.js';
import { resolveCountryId } from '../../helpers/dashboard/countryService.js';
import { lang } from './shared.js';

const register = async (req, res) => {
    const { name, email, phone, password, companyName, companyPhone, companyAddress, countryId } =
        matchedData(req);

    const resolvedCountryId = await resolveCountryId({ countryId, req });
    if (!resolvedCountryId) {
        return errorHandler(res, 'fail', 'countryRequired');
    }

    const exists = await Merchant.findOne({
        where: {
            email: email.trim().toLowerCase(),
            status: { [Op.ne]: 'delete' },
        },
    });
    if (exists) {
        return errorHandler(res, 'fail', 'emailAlreadyExists');
    }

    const company = await Company.create({
        name: companyName,
        phone: companyPhone || '',
        address: companyAddress || '',
        countryId: resolvedCountryId,
        status: 'pending',
    });

    const merchant = await Merchant.create({
        companyId: company.id,
        name,
        email,
        phone: phone || '',
        password,
        status: 'pending',
        active: false,
        language: lang(req),
    });

    let activationCode = null;
    try {
        activationCode = await issueMerchantActivationCode(merchant, lang(req));
    } catch (err) {
        console.warn('Merchant activation email failed:', err.message);
    }

    const payload = {
        needsEmailVerification: true,
        active: false,
        companyId: company.id,
        message: i18n.__('activationCodeSent'),
    };

    if (process.env.TESTING === 'true' && activationCode) {
        payload.activationCode = activationCode;
    }

    res.send(
        new ApiResponse('success', i18n.__('signupSuccessful'), 201, payload)
    );
};

const verifyEmail = async (req, res) => {
    const { email, code } = matchedData(req);

    const merchant = await findMerchantByEmail(email);
    if (!merchant || merchant.status === 'delete') {
        return errorHandler(res, 'notFound', 'merchantNotFound');
    }

    if (merchant.active) {
        return res.send(
            new ApiResponse('success', i18n.__('emailAlreadyVerified'), 200, {
                active: true,
            })
        );
    }

    const codeValid = verifyMerchantActivationCode(merchant, code, res);
    if (codeValid !== true) return;

    await confirmMerchantEmailVerification(merchant);

    res.send(
        new ApiResponse('success', i18n.__('emailActivated'), 200, {
            active: true,
        })
    );
};

const resendActivation = async (req, res) => {
    const { email } = matchedData(req);

    const merchant = await findMerchantByEmail(email);
    if (!merchant || merchant.status === 'delete') {
        return errorHandler(res, 'notFound', 'merchantNotFound');
    }
    if (merchant.active) {
        return errorHandler(res, 'fail', 'emailAlreadyVerified');
    }

    let activationCode = null;
    try {
        activationCode = await issueMerchantActivationCode(merchant, lang(req));
    } catch (err) {
        return errorHandler(res, 'fail', 'emailSendFailed');
    }

    const payload = {};
    if (process.env.TESTING === 'true' && activationCode) {
        payload.activationCode = activationCode;
    }

    res.send(new ApiResponse('success', i18n.__('activationCodeSent'), 200, payload));
};

const login = async (req, res) => {
    const { email, password } = matchedData(req);
    const deviceId = req.body?.deviceId;
    const deviceType = req.body?.deviceType;

    const merchant = await findMerchantByEmail(email);

    const valid = validateMerchant(merchant, res);
    if (valid !== true) return;

    const passwordValid = await validateMerchantPassword(merchant, password, res);
    if (passwordValid !== true) return;

    if (!merchant.active) {
        return handleUnverifiedMerchantLogin(merchant, res, lang(req));
    }

    await handleMerchantLogin(merchant, res, { deviceId, deviceType });
};

const forgotPassword = async (req, res) => {
    const { email } = matchedData(req);

    const merchant = await findMerchantByEmail(email);
    if (!merchant || merchant.status === 'delete') {
        return errorHandler(res, 'notFound', 'merchantNotFound');
    }

    await issueMerchantResetCode(merchant, lang(req));
    res.send(new ApiResponse('success', i18n.__('resetCodeSent'), 200, {}));
};

const resetPassword = async (req, res) => {
    const { email, code, password } = matchedData(req);

    const merchant = await findMerchantByEmail(email);
    if (!merchant || merchant.status === 'delete') {
        return errorHandler(res, 'notFound', 'merchantNotFound');
    }

    const codeValid = verifyMerchantResetCode(merchant, code, res);
    if (codeValid !== true) return;

    await merchant.update({
        password,
        resetCode: null,
        resetCodeExpiresAt: null,
    });

    res.send(new ApiResponse('success', i18n.__('passwordResetSuccessful'), 200, {}));
};

const logout = async (req, res) => {
    await handleMerchantLogout(req, res);
};

export default {
    register,
    verifyEmail,
    resendActivation,
    login,
    forgotPassword,
    resetPassword,
    logout,
};
