import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../../../utils/index.js';
import { errorHandler } from '../../../../helpers/index.js';
import saleReturnService from '../../../../helpers/api/sales/saleReturnService.js';
import { SaleScopeError } from '../../../../helpers/api/sales/saleErrors.js';
import saleReturnObject from '../../../../helpers/api/sales/saleReturnObject.js';
import { buildSaleReturnDocuments } from '../../../../helpers/api/sales/saleReturnPdf.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

const handleError = (res, err) => {
    if (err instanceof SaleScopeError) {
        return errorHandler(res, 'fail', err.code);
    }
    console.error('sale return error:', err);
    return errorHandler(res, 'exception', 'returnDeveloper');
};

export default {
    meta: async (req, res) => {
        try {
            const data = await saleReturnService.getReturnsMeta(req);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.returnMeta(data)
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    returnable: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const data = await saleReturnService.getSaleReturnable(req, id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.returnable(data, lang(req))
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    listForSale: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const result = await saleReturnService.listReturnsForSale(req, id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.saleReturnList(result.items, result.pagination, lang(req))
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    calculate: async (req, res) => {
        try {
            const body = matchedData(req);
            const preview = await saleReturnService.previewSaleReturn(req, body);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.returnPreview(preview, lang(req))
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    create: async (req, res) => {
        try {
            const body = matchedData(req);
            const saleReturn = await saleReturnService.createSaleReturn(req, body);
            const saleReturnDto = saleReturnObject.saleReturn(saleReturn, lang(req));
            const locale = lang(req);

            let documents = null;
            try {
                documents = await buildSaleReturnDocuments(req, saleReturnDto, locale);
            } catch (pdfErr) {
                console.error('sale return pdf after create:', pdfErr);
            }

            res.send(
                new ApiResponse('success', i18n.__('saleReturnCreated'), 201, {
                    ...saleReturnDto,
                    pdf: documents?.pdf ?? null,
                    share: documents?.share ?? null,
                })
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    list: async (req, res) => {
        try {
            const query = matchedData(req, { locations: ['query'] });
            const result = await saleReturnService.listSaleReturns(req, {
                search: query.search || req.query.search,
                saleId: query.saleId || req.query.saleId,
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
                    saleReturnObject.saleReturnList(result.items, result.pagination, lang(req))
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const saleReturn = await saleReturnService.getSaleReturnById(req, id);
            res.send(
                new ApiResponse(
                    'success',
                    i18n.__('dataFetched'),
                    200,
                    saleReturnObject.saleReturn(saleReturn, lang(req))
                )
            );
        } catch (err) {
            return handleError(res, err);
        }
    },

    returnPdf: async (req, res) => {
        try {
            const { id } = matchedData(req, { locations: ['params'] });
            const query = matchedData(req, { locations: ['query'] });
            const saleReturn = await saleReturnService.getSaleReturnById(req, id);
            const saleReturnDto = saleReturnObject.saleReturn(saleReturn, lang(req));
            const documents = await buildSaleReturnDocuments(req, saleReturnDto, lang(req));

            if (query.download === '1' || req.query.download === '1') {
                return res.download(documents.pdf.filePath, documents.pdf.fileName);
            }

            res.send(
                new ApiResponse('success', i18n.__('saleReturnPdfGenerated'), 200, {
                    saleReturn: saleReturnDto,
                    ...documents,
                })
            );
        } catch (err) {
            if (err?.message === 'pdfGenerationFailed') {
                return errorHandler(res, 'exception', 'pdfGenerationFailed');
            }
            return handleError(res, err);
        }
    },
};
