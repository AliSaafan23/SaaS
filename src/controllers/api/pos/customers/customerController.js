import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import { CatalogScopeError } from '../../../../helpers/api/inventory/catalogScope.js';
import customerService from '../../../../helpers/api/customers/customerService.js';
import customerReturnObject from '../../../../helpers/api/customers/customerReturnObject.js';
import {
    generateReceivablesPdf,
    generateWithBalancesPdf,
} from '../../../../helpers/api/customers/customerReportPdf.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const handleCustomerError = (res, err) => {
    if (err instanceof CatalogScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('customer error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    list: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const result = await customerService.listCustomers(req, {
                search: query.search || req.query.search,
                page: query.page || req.query.page || 1,
                limit: query.limit || req.query.limit || 50,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: customerReturnObject.customerList(result.items, lang(req)),
                    pagination: result.pagination,
                })
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const customer = await customerService.findCustomerInScope(req, id);
            if (!customer) {
                return errorHandler(res, 'fail', 'customerNotFound');
            }

            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    customerReturnObject.customer(customer, lang(req))
                )
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    getByBarcode: async (req, res) => {
        try {
            const { barcode } = matchedData(req, { locations: ['params'] });
            const query = matchedData(req, { locations: ['query'] });
            const term = String(
                query.search || req.query.search || barcode || ''
            ).trim();
            const items = await customerService.searchCustomersByBarcode(req, term, {
                limit: query.limit || req.query.limit || 50,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: customerReturnObject.customerList(items, lang(req)),
                })
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    search: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const term = String(query.search || req.query.search || '').trim();
            const items = await customerService.searchCustomers(req, term, {
                limit: query.limit || req.query.limit || 50,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: customerReturnObject.customerList(items, lang(req)),
                })
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const data = matchedData(req);
            const customer = await customerService.createCustomer(req, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('customerCreated'),
                    201,
                    customerReturnObject.customer(customer, lang(req))
                )
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const data = matchedData(req);
            const customer = await customerService.updateCustomer(req, id, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('customerUpdated'),
                    200,
                    customerReturnObject.customer(customer, lang(req))
                )
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    remove: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            await customerService.deleteCustomer(req, id);
            res.send(new ApiResponse('success', i18n.__('customerDeleted'), 200, {}));
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    openingBalances: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const items = await customerService.listOpeningBalances(req, {
                search: query.search || req.query.search,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: customerReturnObject.openingBalanceList(items),
                })
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    updateOpeningBalance: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const data = matchedData(req);
            const customer = await customerService.updateOpeningBalance(req, id, data);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('customerOpeningBalanceUpdated'),
                    200,
                    customerReturnObject.openingBalance(customer)
                )
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    receivables: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const { items, totals } = await customerService.listReceivables(req, {
                search: query.search || req.query.search,
            });

            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, {
                    items: items.map(({ customer, balances }) =>
                        customerReturnObject.receivable(customer, balances)
                    ),
                    totals,
                })
            );
        } catch (err) {
            return handleCustomerError(res, err);
        }
    },

    receivablesReport: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const { items, totals } = await customerService.receivablesReport(req, {
                search: query.search || req.query.search,
            });

            const reportItems = items.map(({ customer, balances }) =>
                customerReturnObject.receivable(customer, balances)
            );
            const report = customerReturnObject.receivablesReport(reportItems, totals);

            if ((query.format || req.query.format) === 'json') {
                return res.send(
                    new ApiResponse('success', i18n.__('dataFetched'), 200, report)
                );
            }

            const pdf = await generateReceivablesPdf(
                req,
                { items: reportItems, totals },
                lang(req)
            );

            if (query.download === '1' || req.query.download === '1') {
                return res.download(pdf.filePath, pdf.fileName);
            }

            res.send(
                new ApiResponse('success', i18n.__('customerReportGenerated'), 200, {
                    ...report,
                    pdf,
                })
            );
        } catch (err) {
            if (err?.message === 'pdfGenerationFailed') {
                return errorHandler(res, 'exception', 'pdfGenerationFailed');
            }
            return handleCustomerError(res, err);
        }
    },

    withBalancesReport: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const { items, totals } = await customerService.customersWithBalancesReport(req, {
                search: query.search || req.query.search,
            });

            const reportItems = items.map(({ customer, balances }) => ({
                id: customer.id,
                customer_code: customer.customer_code,
                name: customer.name,
                phone: customer.phone,
                total_remaining: balances.total,
            }));
            const report = customerReturnObject.withBalancesReport(reportItems, totals);

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
                new ApiResponse('success', i18n.__('customerReportGenerated'), 200, {
                    ...report,
                    pdf,
                })
            );
        } catch (err) {
            if (err?.message === 'pdfGenerationFailed') {
                return errorHandler(res, 'exception', 'pdfGenerationFailed');
            }
            return handleCustomerError(res, err);
        }
    },
};
