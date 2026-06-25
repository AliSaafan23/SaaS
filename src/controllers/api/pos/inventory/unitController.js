import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';
import unitService from '../../../../helpers/api/inventory/unitService.js';
import inventoryReturnObject from '../../../../helpers/api/inventory/inventoryReturnObject.js';

const handleInventoryError = (res, err) => {
    if (err instanceof CatalogScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('unit error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    list: async (req, res) => {
        try {
            const items = await unitService.listUnits(req, { search: req.query.search });
            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: items.map((u) => inventoryReturnObject.unit(u)),
                })
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const { name } = matchedData(req);
            const unit = await unitService.createUnit(req, { name });
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('unitCreated'),
                    201,
                    inventoryReturnObject.unit(unit)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },
};
