import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';
import supplierService from '../../../../helpers/api/suppliers/supplierService.js';
import supplierReturnObject from '../../../../helpers/api/suppliers/supplierReturnObject.js';
import {
    generatePayablesPdf,
    generateWithBalancesPdf,
} from '../../../../helpers/api/suppliers/supplierReportPdf.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const handleSupplierError = (res, err) => {
    if (err instanceof CatalogScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('supplier error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    list: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const result = await supplierService.listSuppliers(req, {
                search: query.search || req.query.search,
                page: query.page || req.query.page || 1,
                limit: query.limit || req.query.limit || 50,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: supplierReturnObject.supplierList(result.items),
                    pagination: result.pagination,
                })
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const supplier = await supplierService.findSupplierInScope(req, id);
            if (!supplier) {
                return errorHandler(res, 'fail', 'supplierNotFound');
            }

            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    supplierReturnObject.supplier(supplier)
                )
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    search: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const term = String(query.search || req.query.search || '').trim();
            const items = await supplierService.searchSuppliers(req, term, {
                limit: query.limit || req.query.limit || 50,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: supplierReturnObject.supplierList(items),
                })
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const data = matchedData(req);
            const supplier = await supplierService.createSupplier(req, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('supplierCreated'),
                    201,
                    supplierReturnObject.supplier(supplier)
                )
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const data = matchedData(req);
            const supplier = await supplierService.updateSupplier(req, id, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('supplierUpdated'),
                    200,
                    supplierReturnObject.supplier(supplier)
                )
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    remove: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            await supplierService.deleteSupplier(req, id);
            res.send(new ApiResponse('success', i18n.__('supplierDeleted'), 200, {}));
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    openingBalances: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const items = await supplierService.listOpeningBalances(req, {
                search: query.search || req.query.search,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: supplierReturnObject.openingBalanceList(items),
                })
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    updateOpeningBalance: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const data = matchedData(req);
            const supplier = await supplierService.updateOpeningBalance(req, id, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('supplierOpeningBalanceUpdated'),
                    200,
                    supplierReturnObject.openingBalance(supplier)
                )
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    payables: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const { items, totals } = await supplierService.listPayables(req, {
                search: query.search || req.query.search,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: items.map(({ supplier, balances }) =>
                        supplierReturnObject.payable(supplier, balances)
                    ),
                    totals,
                })
            );
        } catch (err) {
            return handleSupplierError(res, err);
        }
    },

    payablesReport: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const { items, totals } = await supplierService.payablesReport(req, {
                search: query.search || req.query.search,
            });

            const reportItems = items.map(({ supplier, balances }) =>
                supplierReturnObject.payable(supplier, balances)
            );
            const report = supplierReturnObject.payablesReport(reportItems, totals);

            if ((query.format || req.query.format) === 'json') {
                return res.send(
                    new ApiResponse('success', i18n.__('dataFetched'), 200, report)
                );
            }

            const pdf = await generatePayablesPdf(
                req,
                { items: reportItems, totals },
                lang(req)
            );

            if (query.download === '1' || req.query.download === '1') {
                return res.download(pdf.filePath, pdf.fileName);
            }

            res.send(
                new ApiResponse('success', i18n.__('supplierReportGenerated'), 200, {
                    ...report,
                    pdf,
                })
            );
        } catch (err) {
            if (err?.message === 'pdfGenerationFailed') {
                return errorHandler(res, 'exception', 'pdfGenerationFailed');
            }
            return handleSupplierError(res, err);
        }
    },

    withBalancesReport: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const { items, totals } = await supplierService.suppliersWithBalancesReport(req, {
                search: query.search || req.query.search,
            });

            const reportItems = items.map(({ supplier, balances }) => ({
                id: supplier.id,
                supplier_code: supplier.supplier_code,
                name: supplier.name,
                phone: supplier.phone,
                total_remaining: balances.total,
            }));
            const report = supplierReturnObject.withBalancesReport(reportItems, totals);

            if ((query.format || req.query.format) === 'json') {
                return res.send(
                    new ApiResponse('success', i18n.__('dataFetched'), 200, report)
                );
            }

            const pdf = await generateWithBalancesPdf(
                req,
                { items: reportItems, totals },
                lang(req)
            );

            if (query.download === '1' || req.query.download === '1') {
                return res.download(pdf.filePath, pdf.fileName);
            }

            res.send(
                new ApiResponse('success', i18n.__('supplierReportGenerated'), 200, {
                    ...report,
                    pdf,
                })
            );
        } catch (err) {
            if (err?.message === 'pdfGenerationFailed') {
                return errorHandler(res, 'exception', 'pdfGenerationFailed');
            }
            return handleSupplierError(res, err);
        }
    },
};
