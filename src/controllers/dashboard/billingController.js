import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import { runMonthlyBilling } from '../../helpers/accounting/billingService.js';
import { recordPayment } from '../../helpers/accounting/paymentService.js';
import { runRevenueRecognition } from '../../helpers/accounting/revenueService.js';
import {
    getIncomeStatement,
    getBalanceSheet,
    getReportsDashboard,
    getTransactionsLedger,
} from '../../helpers/accounting/reportsService.js';
import { getRevenueChartData } from '../../helpers/dashboard/revenueChart.js';
import { Invoice, Payment, Customer, Subscription, Plan } from '../../models/index.js';

export default {
    runBilling: async (req, res) => {
        const runDate = req.body.runDate || new Date().toISOString().slice(0, 10);
        const invoices = await runMonthlyBilling(req.tenantId, runDate);
        res.send(
            new ApiResponse('success', i18n.__('billingCompleted'), 200, {
                count: invoices.length,
                invoices: invoices.map((i) => returnObject.invoice(i)),
            })
        );
    },

    listInvoices: async (req, res) => {
        const invoices = await Invoice.findAll({
            where: { tenantId: req.tenantId },
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'avatar'] },
                {
                    model: Subscription,
                    as: 'subscription',
                    attributes: ['id'],
                    include: [{ model: Plan, as: 'plan', attributes: ['id', 'name'] }],
                },
            ],
            order: [['id', 'DESC']],
        });
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                invoices.map((i) => returnObject.invoice(i))
            )
        );
    },

    createPayment: async (req, res) => {
        const { invoiceId, amount, paymentDate } = req.body;
        if (!invoiceId || amount === undefined) return errorHandler(res, 'fail', 'validationFailed');

        try {
            const result = await recordPayment({
                tenantId: req.tenantId,
                invoiceId,
                amount,
                paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
            });
            res.send(
                new ApiResponse('success', i18n.__('paymentRecorded'), 200, {
                    payment: returnObject.payment(result.payment),
                    invoice: returnObject.invoice(result.invoice),
                })
            );
        } catch (err) {
            if (err.code === 'invoiceNotFound') return errorHandler(res, 'notFound', 'invoiceNotFound');
            if (err.code === 'invoiceAlreadyPaid') return errorHandler(res, 'fail', 'invoiceAlreadyPaid');
            if (err.code === 'paymentAmountMismatch') return errorHandler(res, 'fail', 'paymentAmountMismatch');
            console.error(err);
            return errorHandler(res, 'exception', 'returnDeveloper');
        }
    },

    listPayments: async (req, res) => {
        const payments = await Payment.findAll({
            where: { tenantId: req.tenantId },
            include: [
                {
                    model: Invoice,
                    as: 'invoice',
                    attributes: ['id'],
                    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'avatar'] }],
                },
            ],
            order: [['id', 'DESC']],
        });
        res.send(
            new ApiResponse(
                'success',
                i18n.__('dataFetched'),
                200,
                payments.map((p) => returnObject.payment(p))
            )
        );
    },

    runRevenueRecognition: async (req, res) => {
        const periodEnd = req.body.periodEnd || new Date().toISOString().slice(0, 10);
        const invoices = await runRevenueRecognition(req.tenantId, periodEnd);
        res.send(
            new ApiResponse('success', i18n.__('revenueRecognized'), 200, {
                count: invoices.length,
                invoices: invoices.map((i) => returnObject.invoice(i)),
            })
        );
    },

    incomeStatement: async (req, res) => {
        const from = req.query.from;
        const to = req.query.to || new Date().toISOString().slice(0, 10);
        if (!from) return errorHandler(res, 'fail', 'validationFailed');

        const report = await getIncomeStatement({ tenantId: req.tenantId, from, to });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, report));
    },

    balanceSheet: async (req, res) => {
        const asOf = req.query.asOf || new Date().toISOString().slice(0, 10);
        const report = await getBalanceSheet({ tenantId: req.tenantId, asOf });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, report));
    },

    revenueChart: async (req, res) => {
        const { granularity = 'monthly', from, to } = req.query;
        const locale = req.getLocale?.() === 'ar' ? 'ar-EG' : 'en-US';
        const chart = await getRevenueChartData(req.tenantId, { granularity, from, to, locale });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, chart));
    },

    reportsDashboard: async (req, res) => {
        const locale = req.getLocale?.() === 'ar' ? 'ar-EG' : 'en-US';
        const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 3), 12);
        const { from = null, to = null } = req.query;
        const data = await getReportsDashboard({ tenantId: req.tenantId, locale, months, from, to });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },

    transactionsLedger: async (req, res) => {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 200);
        const { from = null, to = null } = req.query;
        const data = await getTransactionsLedger({ tenantId: req.tenantId, limit, from, to });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
    },
};
