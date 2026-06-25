import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { errorHandler } from '../../helpers/index.js';
import { Admin, Role, sequelize } from '../../models/index.js';
import { syncRoleAdminsCount } from './adminRoleController.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const adminInclude = [{ model: Role, as: 'role' }];

export default {
    list: async (req, res) => {
        const admins = await Admin.findAll({
            where: { status: { [Op.ne]: 'delete' }, isHidden: false },
            include: adminInclude,
            order: [['id', 'DESC']],
        });

        const data = admins.map((a) => returnObject.admin(a, lang(req)));
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    getById: async (req, res) => {
        const admin = await Admin.findByPk(req.params.id, { include: adminInclude });
        if (!admin || admin.status === 'delete') {
            return errorHandler(res, 'notFound', 'adminNotFound');
        }

        res.send(
            new ApiResponse('success', i18n.__('dataFetched'), 200, returnObject.admin(admin, lang(req)))
        );
    },

    create: async (req, res) => {
        const data = matchedData(req);

        const role = await Role.findByPk(data.role_id);
        if (!role || !role.isActive) {
            return errorHandler(res, 'fail', 'invalidRole');
        }

        const exists = await Admin.scope('withPassword').findOne({
            where: {
                [Op.or]: [{ email: data.email.trim().toLowerCase() }],
                status: { [Op.ne]: 'delete' },
            },
        });
        if (exists) return errorHandler(res, 'fail', 'emailAlreadyExists');

        const admin = await sequelize.transaction(async (tx) => {
            const created = await Admin.create(
                {
                    name: data.name,
                    email: data.email,
                    phone: data.phone || '',
                    password: data.password,
                    role_id: data.role_id,
                    language: data.language || 'ar',
                    theme: data.theme || 'light',
                    isAdmin: data.isAdmin || false,
                    canEdit: data.canEdit !== false,
                    canDelete: data.canDelete !== false,
                    status: 'active',
                    active: true,
                },
                { transaction: tx }
            );

            await syncRoleAdminsCount(data.role_id, tx);
            return created;
        });

        await admin.reload({ include: adminInclude });

        res.send(
            new ApiResponse('success', i18n.__('adminCreated'), 201, returnObject.admin(admin, lang(req)))
        );
    },

    update: async (req, res) => {
        const admin = await Admin.scope('withPassword').findByPk(req.params.id, {
            include: adminInclude,
        });
        if (!admin || admin.status === 'delete') {
            return errorHandler(res, 'notFound', 'adminNotFound');
        }

        const data = matchedData(req);
        const oldRoleId = admin.role_id;

        if (data.email && data.email !== admin.email) {
            const dup = await Admin.findOne({
                where: {
                    email: data.email.trim().toLowerCase(),
                    id: { [Op.ne]: admin.id },
                    status: { [Op.ne]: 'delete' },
                },
            });
            if (dup) return errorHandler(res, 'fail', 'emailAlreadyExists');
        }

        if (data.role_id) {
            const role = await Role.findByPk(data.role_id);
            if (!role || !role.isActive) {
                return errorHandler(res, 'fail', 'invalidRole');
            }
        }

        await sequelize.transaction(async (tx) => {
            const updates = {};
            if (data.name) updates.name = data.name;
            if (data.email) updates.email = data.email;
            if (data.phone !== undefined) updates.phone = data.phone;
            if (data.password) updates.password = data.password;
            if (data.role_id) updates.role_id = data.role_id;
            if (data.language) updates.language = data.language;
            if (data.theme) updates.theme = data.theme;
            if (data.status) updates.status = data.status;
            if (data.isAdmin !== undefined) updates.isAdmin = data.isAdmin;
            if (data.canEdit !== undefined) updates.canEdit = data.canEdit;
            if (data.canDelete !== undefined) updates.canDelete = data.canDelete;

            await admin.update(updates, { transaction: tx });

            if (data.role_id && data.role_id !== oldRoleId) {
                await syncRoleAdminsCount(oldRoleId, tx);
                await syncRoleAdminsCount(data.role_id, tx);
            }
        });

        await admin.reload({ include: adminInclude });

        res.send(
            new ApiResponse('success', i18n.__('adminUpdated'), 200, returnObject.admin(admin, lang(req)))
        );
    },

    remove: async (req, res) => {
        const targetId = Number(req.params.id);

        if (req.admin.id === targetId) {
            return errorHandler(res, 'fail', 'cannotDeleteSelf');
        }

        const admin = await Admin.findByPk(targetId);
        if (!admin || admin.status === 'delete') {
            return errorHandler(res, 'notFound', 'adminNotFound');
        }

        const roleId = admin.role_id;

        await sequelize.transaction(async (tx) => {
            await admin.update({ status: 'delete', active: false }, { transaction: tx });
            await syncRoleAdminsCount(roleId, tx);
        });

        res.send(new ApiResponse('success', i18n.__('adminDeleted'), 200, {}));
    },
};
