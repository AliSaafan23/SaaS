import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import merchantMetrics from '../../helpers/merchant/merchantMetrics.js';
import branchMetrics from '../../helpers/merchant/branchMetrics.js';
import { listCompanySaleReturns } from '../../helpers/merchant/merchantSaleReturns.js';
import { resolveBranchFilter } from '../../helpers/merchant/branchScope.js';
import { buildBranchesSummaryExcel } from '../../helpers/merchant/merchantExport.js';

const statsLang = (req) => (req.headers.lang === 'en' ? 'en' : 'ar');

export default {
    overview: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { branchId, from, to } = req.query;
            const data = await merchantMetrics.getOverview(companyId, branchId, from, to, statsLang(req));
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    chart: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { type } = req.params;
            const { branchId, from, to } = req.query;
            const result = await merchantMetrics.getChartByType(
                type,
                companyId,
                branchId,
                from,
                to,
                statsLang(req)
            );
            if (!result) {
                return errorHandler(res, 'notFound', 'notFound');
            }
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, result));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    branchesSummary: async (req, res) => {
        const companyId = req.merchant.companyId;
        const { from, to } = req.query;
        const data = await merchantMetrics.getBranchesSummary(companyId, from, to);
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    lowStock: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { branchId } = req.query;
            const data = await branchMetrics.getLowStockAlerts(companyId, branchId || null);
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    branchOverview: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { id } = req.params;
            const { from, to } = req.query;
            const data = await branchMetrics.getBranchOverview(companyId, id, from, to);
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    branchStock: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { id } = req.params;
            const branchId = await resolveBranchFilter(companyId, id);
            const data = await branchMetrics.getBranchStockLevels(companyId, branchId);
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    branchCustomers: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { id } = req.params;
            const data = await branchMetrics.getBranchCustomers(companyId, id);
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    branchSuppliers: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { id } = req.params;
            const data = await branchMetrics.getBranchSuppliers(companyId, id);
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },

    exportBranchesSummary: async (req, res) => {
        const companyId = req.merchant.companyId;
        const { from, to } = req.query;
        const lang = statsLang(req);
        const wb = await buildBranchesSummaryExcel(companyId, from, to, lang);
        const buffer = await wb.xlsx.writeBuffer();
        const filename = lang === 'en' ? 'branches-summary.xlsx' : 'ملخص-الفروع.xlsx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(buffer));
    },

    saleReturns: async (req, res) => {
        try {
            const companyId = req.merchant.companyId;
            const { branchId, from, to, page, limit } = req.query;
            const data = await listCompanySaleReturns(companyId, {
                branchId,
                from,
                to,
                page,
                limit,
            });
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
        } catch (err) {
            if (err.code === 'BRANCH_FORBIDDEN') {
                return errorHandler(res, 'notFound', 'branchNotFound');
            }
            throw err;
        }
    },
};
