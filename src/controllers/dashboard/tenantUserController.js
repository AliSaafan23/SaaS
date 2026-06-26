import { TenantUser, TenantRole } from '../../models/index.js';
import { ApiError } from '../../utils/index.js';
import i18n from 'i18n';

const errorRes = new ApiError('', '');

export default {
    getAll: async (req, res) => {
        const users = await TenantUser.findAll({
            where: { tenantId: req.tenantId },
            include: [{ model: TenantRole, as: 'role', attributes: ['id', 'name', 'slug'] }],
            order: [['createdAt', 'DESC']]
        });
        return res.json({ success: true, data: users });
    },

    getOne: async (req, res) => {
        const user = await TenantUser.findOne({
            where: { id: req.params.id, tenantId: req.tenantId },
            include: [{ model: TenantRole, as: 'role', attributes: ['id', 'name', 'slug'] }]
        });
        if (!user) return errorRes.responseError(res, i18n.__('userNotFound'), 404);
        return res.json({ success: true, data: user });
    },

    create: async (req, res) => {
        const { name, email, password, roleId, status } = req.body;
        
        // Check if email exists
        const existing = await TenantUser.findOne({ where: { email } });
        if (existing) return errorRes.responseError(res, i18n.__('emailAlreadyExists'), 400);

        // Verify role belongs to tenant
        if (roleId) {
            const role = await TenantRole.findOne({ where: { id: roleId, tenantId: req.tenantId } });
            if (!role) return errorRes.responseError(res, i18n.__('roleNotFound'), 400);
        }

        const user = await TenantUser.create({
            tenantId: req.tenantId,
            name,
            email,
            password,
            roleId,
            status: status || 'active',
            emailVerified: true // Admins added manually are verified
        });

        return res.json({ success: true, message: i18n.__('userCreated'), data: user });
    },

    update: async (req, res) => {
        const user = await TenantUser.findOne({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!user) return errorRes.responseError(res, i18n.__('userNotFound'), 404);

        const { name, email, password, roleId, status } = req.body;

        if (email && email !== user.email) {
            const existing = await TenantUser.findOne({ where: { email } });
            if (existing) return errorRes.responseError(res, i18n.__('emailAlreadyExists'), 400);
            user.email = email;
        }

        if (roleId) {
            const role = await TenantRole.findOne({ where: { id: roleId, tenantId: req.tenantId } });
            if (!role) return errorRes.responseError(res, i18n.__('roleNotFound'), 400);
            user.roleId = roleId;
        }

        if (name) user.name = name;
        if (password) user.password = password;
        if (status) user.status = status;

        await user.save();
        return res.json({ success: true, message: i18n.__('userUpdated'), data: user });
    },

    delete: async (req, res) => {
        const user = await TenantUser.findOne({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!user) return errorRes.responseError(res, i18n.__('userNotFound'), 404);

        // Prevent deleting self
        if (user.id === req.tenantUser.id) {
            return errorRes.responseError(res, i18n.__('cannotDeleteSelf'), 400);
        }

        await user.destroy();
        return res.json({ success: true, message: i18n.__('userDeleted') });
    }
};
