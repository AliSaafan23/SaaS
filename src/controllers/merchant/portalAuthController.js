import { matchedData } from 'express-validator';
import {
    findMerchantByEmail,
    validateMerchant,
    validateMerchantPassword,
    handleUnverifiedMerchantLogin,
} from '../../helpers/api/merchantAuth.js';
import { handleMerchantWebLogin, handleMerchantWebLogout } from '../../helpers/merchant/merchantAuth.js';
import { lang } from './shared.js';

export default {
    signin: async (req, res) => {
        const { email, password } = matchedData(req);

        const merchant = await findMerchantByEmail(email);
        const valid = validateMerchant(merchant, res);
        if (valid !== true) return;

        const passwordValid = await validateMerchantPassword(merchant, password, res);
        if (passwordValid !== true) return;

        if (!merchant.active) {
            return handleUnverifiedMerchantLogin(merchant, res, lang(req));
        }

        await handleMerchantWebLogin(merchant, req, res);
    },

    signout: async (req, res) => {
        await handleMerchantWebLogout(req, res);
    },
};
