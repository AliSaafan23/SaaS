import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../utils/index.js';
import {
    findAdminByEmail,
    validateAdmin,
    validateAdminPassword,
    handleDashboardLogin,
    handleDashboardLogout,
} from '../../helpers/dashboard/adminAuth.js';
import returnObject from '../../helpers/dashboard/returnobject.js';

export default {
    signin: async (req, res) => {
        const { email, password } = matchedData(req);

        const admin = await findAdminByEmail(email);

        const valid = validateAdmin(admin, res);
        if (valid !== true) return;

        const passwordValid = await validateAdminPassword(admin, password, res);
        if (passwordValid !== true) return;

        await handleDashboardLogin(admin, req, res);
    },

    profile: async (req, res) => {
        const data = returnObject.adminProfile(req.admin, req.session?.token || '');
        res.send(new ApiResponse('success', i18n.__('profileFetched'), 200, data));
    },

    logout: async (req, res) => {
        await handleDashboardLogout(req, res);
    },
};
