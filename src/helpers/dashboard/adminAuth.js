import jwt from 'jsonwebtoken';
import i18n from 'i18n';
import { Op } from 'sequelize';
import { Admin, Role, UserToken } from '../../models/index.js';
import { errorHandler } from '../index.js';
import returnObject from '../dashboard/returnobject.js';
import { ApiResponse } from '../../utils/index.js';

const normalizeEmail = (email) => email?.trim().toLowerCase();

export const findAdminByEmail = async (email) => {
    return Admin.scope('withPassword').findOne({
        where: {
            email: normalizeEmail(email),
            status: { [Op.ne]: 'delete' },
        },
        include: [{ model: Role, as: 'role' }],
    });
};

export const validateAdmin = (admin, res, notFoundKey = 'adminNotFound') => {
    if (!admin) {
        return errorHandler(res, 'notFound', notFoundKey);
    }
    if (admin.status === 'block') {
        return errorHandler(res, 'blocked', 'accountStop');
    }
    if (admin.status === 'delete') {
        return errorHandler(res, 'notFound', notFoundKey);
    }
    return true;
};

export const validateAdminPassword = async (admin, password, res) => {
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
        return errorHandler(res, 'fail', 'invalidEmailOrPassword');
    }
    return true;
};

export const createDashboardSessionToken = async (adminId) => {
    const token = jwt.sign(
        {
            sub: adminId,
            userType: 'admin',
            iss: 'App',
            iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: '24h' }
    );

    await UserToken.update(
        { expired: true },
        { where: { userId: adminId, userRef: 'Admin' } }
    );

    await UserToken.create({
        userId: adminId,
        userRef: 'Admin',
        token,
    });

    return token;
};

export const handleDashboardLogin = async (admin, req, res) => {
    admin.active = true;
    await admin.save();

    const token = await createDashboardSessionToken(admin.id);
    req.session.token = token;

    const adminData = returnObject.adminProfile(admin, token);

    return res.send(
        new ApiResponse('success', i18n.__('loginSuccessful'), 200, adminData)
    );
};

export const handleDashboardLogout = async (req, res) => {
    const token = req.session?.token;

    if (token) {
        await UserToken.update(
            { expired: true },
            { where: { token, userRef: 'Admin' } }
        );
    }

    req.session.destroy(() => {
        res.send(new ApiResponse('success', i18n.__('logoutSuccessful'), 200, {}));
    });
};

export default {
    findAdminByEmail,
    validateAdmin,
    validateAdminPassword,
    createDashboardSessionToken,
    handleDashboardLogin,
    handleDashboardLogout,
};
