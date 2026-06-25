import jwt from 'jsonwebtoken';
import i18n from 'i18n';
import { Merchant, Company, UserToken } from '../../models/index.js';
import { ApiResponse } from '../../utils/index.js';
import returnObject from './returnobject.js';

export const createMerchantSessionToken = async (merchantId) => {
    const token = jwt.sign(
        {
            sub: merchantId,
            userType: 'merchant',
            iss: 'App',
            iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '10d' }
    );

    await UserToken.update(
        { expired: true },
        { where: { userId: merchantId, userRef: 'Merchant' } }
    );

    await UserToken.create({
        userId: merchantId,
        userRef: 'Merchant',
        token,
    });

    return token;
};

export const handleMerchantWebLogin = async (merchant, req, res) => {
    const token = await createMerchantSessionToken(merchant.id);
    req.session.token = token;

    const company = await Company.findByPk(merchant.companyId);
    const data = returnObject.merchantSessionProfile(merchant, company, token);

    return res.send(
        new ApiResponse('success', i18n.__('loginSuccessful'), 200, data)
    );
};

export const handleMerchantWebLogout = async (req, res) => {
    const sessionToken = req.session?.token;
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const token = sessionToken || bearerToken;

    if (token) {
        await UserToken.update(
            { expired: true },
            { where: { token, userRef: 'Merchant' } }
        );
    }

    return new Promise((resolve) => {
        req.session.destroy(() => {
            res.send(new ApiResponse('success', i18n.__('logoutSuccessful'), 200, {}));
            resolve();
        });
    });
};

export default {
    createMerchantSessionToken,
    handleMerchantWebLogin,
    handleMerchantWebLogout,
};
