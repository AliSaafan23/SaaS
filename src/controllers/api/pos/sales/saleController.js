import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import saleService from '../../../../helpers/api/sales/saleService.js';
import { SaleScopeError } from '../../../../helpers/api/sales/saleErrors.js';
import saleReturnObject from '../../../../helpers/api/sales/saleReturnObject.js';
import { buildSaleInvoiceDocuments } from '../../../../helpers/api/sales/saleInvoicePdf.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const handleSaleError = (res, err) => {
    if (err instanceof SaleScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('sale error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    meta: async (req, res) => {
        try {
            const data = await saleService.getSalesMeta(req);
            res.send(
                new ApiResponse('success', i18n.__('dataFetched'), 200, saleReturnObject.meta(data))
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    calculate: async (req, res) => {
        try {
            const body = matchedData(req);
            const totals = await saleService.calculateSalePreview(req, body);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.calculate(totals)
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    list: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const result = await saleService.listSales(req, {
                search: query.search || req.query.search,
                status: query.status || req.query.status,
                page: query.page || req.query.page,
                limit: query.limit || req.query.limit,
            });

            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.saleList(result.items, result.pagination, lang(req))
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const sale = await saleService.getSaleById(req, id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.sale(sale, lang(req))
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    invoicePdf: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const query = matchedData(req, { locations: ['query'] });
            const sale = await saleService.getSaleById(req, id);
            const saleDto = saleReturnObject.sale(sale, lang(req));
            const locale = lang(req);

            const documents = await buildSaleInvoiceDocuments(req, saleDto, locale);

            if (query.download === '1' || req.query.download === '1') {
                return res.download(documents.pdf.filePath, documents.pdf.fileName);
            }

            res.send(
                new ApiResponse('success', i18n.__('saleInvoicePdfGenerated'), 200, {
                    sale: saleDto,
                    ...documents,
                })
            );
        } catch (err) {
            if (err?.message === 'pdfGenerationFailed') {
                return errorHandler(res, 'exception', 'pdfGenerationFailed');
            }
            return handleSaleError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const body = matchedData(req);
            const sale = await saleService.createSale(req, body);
            const saleDto = saleReturnObject.sale(sale, lang(req));
            const locale = lang(req);

            let documents = null;
            try {
                documents = await buildSaleInvoiceDocuments(req, saleDto, locale);
            } catch (pdfErr) {
                console.error('sale invoice pdf after create:', pdfErr);
            }

            res.send(
                new ApiResponse('success', i18n.__('saleCreated'), 201, {
                    ...saleDto,
                    pdf: documents?.pdf ?? null,
                    share: documents?.share ?? null,
                })
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const body = matchedData(req);
            const sale = await saleService.updateSale(req, id, body);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('saleUpdated'),
                    200,
                    saleReturnObject.sale(sale, lang(req))
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    cancel: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const sale = await saleService.cancelSale(req, id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('saleCancelled'),
                    200,
                    saleReturnObject.sale(sale, lang(req))
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    customerReceivable: async (req, res) => {
        try {
            const { customerId } = matchedData(req, { locations: ['params'] });
            const { customer, balances } = await saleService.getCustomerReceivableForSale(
                req,
                customerId
            );
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.customerReceivable(customer, balances)
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    listCustomerPayments: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const result = await saleService.listCustomerPayments(req, {
                search: query.search || req.query.search,
                customerId: query.customerId || req.query.customerId,
                paymentMethodId: query.paymentMethodId || req.query.paymentMethodId,
                dateFrom: query.dateFrom || req.query.dateFrom,
                dateTo: query.dateTo || req.query.dateTo,
                page: query.page || req.query.page,
                limit: query.limit || req.query.limit,
            });
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.customerPaymentList(
                        result.items,
                        result.pagination,
                        lang(req)
                    )
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    listCustomerPaymentsByCustomer: async (req, res) => {
        try {
            const { customerId } = matchedData(req, { locations: ['params'] });
            const query = matchedData(req, { locations: ['query'] });
            const result = await saleService.listCustomerPaymentsByCustomer(req, customerId, {
                paymentMethodId: query.paymentMethodId || req.query.paymentMethodId,
                dateFrom: query.dateFrom || req.query.dateFrom,
                dateTo: query.dateTo || req.query.dateTo,
                page: query.page || req.query.page,
                limit: query.limit || req.query.limit,
            });
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.customerPaymentList(
                        result.items,
                        result.pagination,
                        lang(req)
                    )
                )
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },

    customerDebtPayment: async (req, res) => {
        try {
            const { customerId } = matchedData(req, { locations: ['params'] });
            const body = matchedData(req);
            const { payment, customer, balances } = await saleService.recordCustomerDebtPayment(
                req,
                body,
                customerId
            );
            res.send(
                new ApiResponse('success', i18n.__('customerPaymentRecorded'), 201, {
                    payment: saleReturnObject.customerPayment(payment),
                    receivable: saleReturnObject.customerReceivable(customer, balances),
                })
            );
        } catch (err) {
            return handleSaleError(res, err);
        }
    },
};
