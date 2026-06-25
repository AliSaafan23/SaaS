import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { AuditLog } from '../../models/index.js';

export default {
    list: async (req, res) => {
        const logs = await AuditLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100,
        });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, logs));
    },
};
