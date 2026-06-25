import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import dashboardStats from '../../helpers/dashboard/dashboardStats.js';

const dashboardLang = (req) => (req.headers.lang === 'en' ? 'en' : 'ar');

export default {
    overview: async (req, res) => {
        const data = await dashboardStats.getOverviewStats();
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    charts: async (req, res) => {
        const data = await dashboardStats.getChartsBundle(dashboardLang(req));
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    chart: async (req, res) => {
        const { type } = req.params;
        const { from, to } = req.query;
        const result = await dashboardStats.getChartByType(type, from, to, dashboardLang(req));
        if (!result) {
            return res.status(404).send(new ApiResponse('fail', i18n.__('notFound'), 404));
        }
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, result));
    },

    activities: async (req, res) => {
        const data = await dashboardStats.getRecentActivities();
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },
};
