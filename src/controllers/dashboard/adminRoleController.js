import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { errorHandler } from '../../helpers/index.js';
import { Admin, Role, sequelize } from '../../models/index.js';
import permissionsConfig from '../../config/permissions.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const syncRoleAdminsCount = async (roleId, transaction) => {
    if (!roleId) return;
    const count = await Admin.count({
        where: { role_id: roleId, status: { [Op.ne]: 'delete' } },
        transaction,
    });
    await Role.update({ adminsCount: count }, { where: { id: roleId }, transaction });
};

export default {
    listPermissions: async (req, res) => {
        res.send(
            new ApiResponse('success', i18n.__('dataFetched'), 200, permissionsConfig)
        );
    },

    list: async (req, res) => {
        const roles = await Role.findAll({ order: [['id', 'DESC']] });
        const data = roles.map((r) => returnObject.role(r, lang(req)));

        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    getById: async (req, res) => {
        const role = await Role.findByPk(req.params.id);
        if (!role) return errorHandler(res, 'notFound', 'roleNotFound');

        res.send(
            new ApiResponse('success', i18n.__('dataFetched'), 200, returnObject.role(role, lang(req)))
        );
    },

    create: async (req, res) => {
        const data = matchedData(req);

        const role = await Role.create({
            name: data.name,
            description: data.description || { ar: '', en: '' },
            permissions: data.permissions,
            color: data.color || '#696cff',
            isActive: data.isActive !== false,
        });

        res.send(
            new ApiResponse('success', i18n.__('roleCreated'), 201, returnObject.role(role, lang(req)))
        );
    },

    update: async (req, res) => {
        const role = await Role.findByPk(req.params.id);
        if (!role) return errorHandler(res, 'notFound', 'roleNotFound');

        const data = matchedData(req);
        const updates = {};

        if (data.name) updates.name = data.name;
        if (data.description) updates.description = data.description;
        if (data.permissions) updates.permissions = data.permissions;
        if (data.color) updates.color = data.color;
        if (data.isActive !== undefined) updates.isActive = data.isActive;

        await role.update(updates);

        res.send(
            new ApiResponse('success', i18n.__('roleUpdated'), 200, returnObject.role(role, lang(req)))
        );
    },

    remove: async (req, res) => {
        const role = await Role.scope('withDeleted').findByPk(req.params.id);
        if (!role || role.isDeleted) return errorHandler(res, 'notFound', 'roleNotFound');

        const adminsCount = await Admin.count({
            where: { role_id: role.id, status: { [Op.ne]: 'delete' } },
        });

        if (adminsCount > 0) {
            return errorHandler(res, 'fail', 'roleHasAdmins');
        }

        await role.update({ isDeleted: true, isActive: false });

        res.send(new ApiResponse('success', i18n.__('roleDeleted'), 200, {}));
    },
};

export { syncRoleAdminsCount };
