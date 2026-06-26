import jwt from 'jsonwebtoken';
import i18n from 'i18n';
import { Op } from 'sequelize';
import { sequelize, Tenant, TenantUser, UserToken } from '../../models/index.js';
import errorHandler from '../common/errorHandler.js';
import returnObject from './returnobject.js';
import { ApiResponse } from '../../utils/index.js';
import { seedChartOfAccounts } from '../accounting/seedChartOfAccounts.js';

const normalizeEmail = (email) => email?.trim().toLowerCase();

const slugify = (name) =>
    `${name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 40)}-${Date.now()}`;

export const findTenantUserByEmail = async (email) =>
    TenantUser.scope('withPassword').findOne({
        where: { email: normalizeEmail(email), status: { [Op.ne]: 'delete' } },
        include: [{ model: Tenant, as: 'tenant' }],
    });

export const validateTenantUser = (user, res) => {
    if (!user) return errorHandler(res, 'notFound', 'userNotFound');
    if (user.status === 'block') return errorHandler(res, 'blocked', 'accountStop');
    if (user.status === 'delete') return errorHandler(res, 'notFound', 'userNotFound');
    if (user.tenant?.status === 'suspended') return errorHandler(res, 'blocked', 'tenantSuspended');
    return true;
};

export const validateTenantUserPassword = async (user, password, res) => {
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return errorHandler(res, 'fail', 'invalidEmailOrPassword');
    return true;
};

export const createDashboardSessionToken = async (user) => {
    const token = jwt.sign(
        {
            sub: user.id,
            tenantId: user.tenantId,
            userType: 'TenantUser',
            iss: 'App',
            iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );

    await UserToken.update(
        { expired: true },
        { where: { userId: user.id, userRef: 'TenantUser' } }
    );

    await UserToken.create({
        userId: user.id,
        userRef: 'TenantUser',
        token,
        expired: false,
    });

    return token;
};

export const registerTenant = async ({ companyName, adminName, email, password }) => {
    const normalizedEmail = normalizeEmail(email);

    const existing = await TenantUser.scope('withPassword').findOne({
        where: { email: normalizedEmail },
    });
    if (existing) {
        const err = new Error('emailAlreadyExists');
        err.code = 'emailAlreadyExists';
        throw err;
    }

    return sequelize.transaction(async (transaction) => {
        const tenant = await Tenant.create(
            { name: companyName, slug: slugify(companyName), status: 'active' },
            { transaction }
        );

        const user = await TenantUser.create(
            {
                tenantId: tenant.id,
                name: adminName,
                email: normalizedEmail,
                password,
                status: 'active',
            },
            { transaction }
        );

        await seedChartOfAccounts(tenant.id, transaction);

        return { tenant, user };
    });
};

export const sendAuthSuccess = (res, user, token) => {
    res.send(
        new ApiResponse('success', i18n.__('loginSuccessful'), 200, {
            ...returnObject.tenantUserProfile(user),
            token,
        })
    );
};

export default {
    findTenantUserByEmail,
    validateTenantUser,
    validateTenantUserPassword,
    createDashboardSessionToken,
    registerTenant,
    sendAuthSuccess,
};
