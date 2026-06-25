import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { getCashboxShiftSummary } from '../../../../helpers/api/cashbox/cashboxSummaryService.js';
import {
    ShiftScopeError,
    getActiveShift,
    openCashierShift,
    closeCashierShift,
} from '../../../../helpers/api/cashbox/shiftService.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';
import saleReturnObject from '../../../../helpers/api/sales/saleReturnObject.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const handleError = (res, err) => {
    if (err instanceof CatalogScopeError || err instanceof ShiftScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('cashbox error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

const shiftDto = (shift) =>
    shift
        ? {
              id: shift.id,
              branchId: shift.branchId,
              cashierId: shift.cashierId,
              opening_cash: Number(shift.opening_cash),
              closing_cash: shift.closing_cash != null ? Number(shift.closing_cash) : null,
              opened_at: shift.opened_at,
              closed_at: shift.closed_at,
              notes: shift.notes,
          }
        : null;

export default {
    shiftSummary: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const summary = await getCashboxShiftSummary(req, {
                dateFrom: query.dateFrom || req.query.dateFrom,
                dateTo: query.dateTo || req.query.dateTo,
                cashierId: query.cashierId || req.query.cashierId,
                shiftId: query.shiftId || req.query.shiftId,
            });
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.cashboxShiftSummary(summary, lang(req))
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    activeShift: async (req, res) => {
        try {
            const shift = await getActiveShift(req);
            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    active: Boolean(shift),
                    shift: shiftDto(shift),
                })
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    openShift: async (req, res) => {
        try {
            const body = matchedData(req, { locations: ['body'] });
            const shift = await openCashierShift(req, {
                openingCash: body.openingCash ?? 0,
                notes: body.notes,
            });
            res.send(
                new ApiResponse('success', i18n.__('shiftOpened'), 201, { shift: shiftDto(shift) })
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    closeShift: async (req, res) => {
        try {
            const body = matchedData(req, { locations: ['body'] });
            const shift = await closeCashierShift(req, {
                closingCash: body.closingCash,
                notes: body.notes,
            });
            res.send(
                new ApiResponse('success', i18n.__('shiftClosed'), 200, { shift: shiftDto(shift) })
            );
        } catch (err) {
            return handleError(res, err);
        }
    },
};
