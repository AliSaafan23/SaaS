import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';
import categoryService from '../../../../helpers/api/inventory/categoryService.js';
import inventoryReturnObject from '../../../../helpers/api/inventory/inventoryReturnObject.js';

const handleInventoryError = (res, err) => {
    if (err instanceof CatalogScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('category error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    list: async (req, res) => {
        try {
            const items = await categoryService.listCategories(req, {
                search: req.query.search,
            });
            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: items.map((c) => inventoryReturnObject.category(c)),
                })
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const { name } = matchedData(req);
            const category = await categoryService.createCategory(req, { name });
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('categoryCreated'),
                    201,
                    inventoryReturnObject.category(category)
                )
            );
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },

    remove: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            await categoryService.deleteCategory(req, id);
            res.send(new ApiResponse('success', i18n.__('categoryDeleted'), 200, {}));
        } catch (err) {
            return handleInventoryError(res, err);
        }
    },
};
