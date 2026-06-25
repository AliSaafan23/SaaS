import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import { Notification } from '../../models/index.js';

export default {
    list: async (req, res) => {
        const items = await Notification.findAll({ order: [['id', 'DESC']], limit: 50 });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, items));
    },

    create: async (req, res) => {
        const data = req.body;
        const item = await Notification.create({
            title: data.title,
            message: data.message,
            type: data.type || 'system',
            targetType: data.targetType || 'all',
            targetId: data.targetId || null,
            sentByAdminId: req.admin?.id || null,
        });
        await logAudit(req, { action: 'notification.sent', module: 'notifications', metadata: { id: item.id } });
        res.send(new ApiResponse('success', i18n.__('notificationSent'), 201, item));
    },
};
