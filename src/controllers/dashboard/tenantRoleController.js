import { TenantRole } from '../../models/index.js';
import { ApiError } from '../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

export default {
    getAll: async (req, res) => {
        const roles = await TenantRole.findAll({
            where: { tenantId: req.tenantId },
            order: [['isSystem', 'DESC'], ['name', 'ASC']]
        });
        return res.json({ success: true, data: roles });
    },

    getOne: async (req, res) => {
        const role = await TenantRole.findOne({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!role) return errorRes.responseError(res, i18n.__('roleNotFound'), 404);
        return res.json({ success: true, data: role });
    },

    create: async (req, res) => {
        const { name, permissions } = req.body;
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        
        const role = await TenantRole.create({
            tenantId: req.tenantId,
            name,
            slug,
            permissions: permissions || [],
            isSystem: false
        });
        
        return res.json({ success: true, message: i18n.__('roleCreated'), data: role });
    },

    update: async (req, res) => {
        const role = await TenantRole.findOne({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!role) return errorRes.responseError(res, i18n.__('roleNotFound'), 404);
        if (role.isSystem) return errorRes.responseError(res, i18n.__('cannotEditSystemRole'), 403);

        const { name, permissions } = req.body;
        if (name) {
            role.name = name;
            role.slug = name.toLowerCase().replace(/\s+/g, '-');
        }
        if (permissions) role.permissions = permissions;
        
        await role.save();
        return res.json({ success: true, message: i18n.__('roleUpdated'), data: role });
    },

    delete: async (req, res) => {
        const role = await TenantRole.findOne({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!role) return errorRes.responseError(res, i18n.__('roleNotFound'), 404);
        if (role.isSystem) return errorRes.responseError(res, i18n.__('cannotDeleteSystemRole'), 403);

        await role.destroy();
        return res.json({ success: true, message: i18n.__('roleDeleted') });
    }
};
