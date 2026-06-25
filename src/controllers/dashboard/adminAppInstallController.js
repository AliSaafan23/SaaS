import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import {
    listAppInstalls,
    getAppInstallStats,
} from '../../helpers/api/appInstallService.js';

const dashboardLang = (req) => (req.headers.lang === 'en' ? 'en' : 'ar');

export default {
    stats: async (req, res) => {
        const stats = await getAppInstallStats();
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, stats));
    },

    list: async (req, res) => {
        const { rows, count, limit, offset } = await listAppInstalls(req.query);
        const lang = dashboardLang(req);

        res.send(
            new ApiResponse('success', i18n.__('dataFetched'), 200, {
                items: rows.map((row) => returnObject.appInstall(row, lang)),
                total: count,
                limit,
                offset,
            })
        );
    },
};
