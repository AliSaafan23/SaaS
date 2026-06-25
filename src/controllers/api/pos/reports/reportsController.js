import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { getDailySalesReport } from '../../../../helpers/api/reports/reportsDailyService.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';

export default {
    dailySales: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const report = await getDailySalesReport(req, {
                dateFrom: query.dateFrom || req.query.dateFrom,
                dateTo: query.dateTo || req.query.dateTo,
                cashierId: query.cashierId || req.query.cashierId,
                shiftId: query.shiftId || req.query.shiftId,
            });
            res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, report));
        } catch (err) {
            if (err instanceof CatalogScopeError) {
                return errorHandler(res, 'fail', err.code);
            }
            console.error('reports error:', err);
            return errorHandler(res, 'exception', 'returnDeveloper');
        }
    },
};
