import { describe, it, expect } from 'vitest';
import {
    roundMoney,
    computeLineTotal,
    syncInvoiceDiscount,
    computeSaleTotals,
    computeSalePreview,
    resolvePaymentMethod,
} from '../../src/helpers/api/sales/saleCalculations.js';

describe('saleCalculations', () => {
    it('computes line total with discount and tax', () => {
        expect(computeLineTotal({ qty: 2, price: 25, discount: 5, tax: 2 })).toBe(47);
    });

    it('syncs discount percent from amount', () => {
        const result = syncInvoiceDiscount({
            subtotalAfterItems: 100,
            invoiceDiscount: 10,
            discountPercent: 0,
        });
        expect(result.invoice_discount).toBe(10);
        expect(result.discount_percent).toBe(10);
    });

    it('syncs discount amount from percent', () => {
        const result = syncInvoiceDiscount({
            subtotalAfterItems: 200,
            invoiceDiscount: 0,
            discountPercent: 25,
        });
        expect(result.invoice_discount).toBe(50);
        expect(result.discount_percent).toBe(25);
    });

    it('computes sale totals and remaining due', () => {
        const totals = computeSaleTotals({
            items: [{ qty: 1, price: 25, discount: 0, tax: 0 }],
            invoiceDiscount: 0,
            discountPercent: 0,
            paidAmount: 10,
        });

        expect(totals.total).toBe(25);
        expect(totals.paid_amount).toBe(10);
        expect(totals.due_amount).toBe(15);
    });

    it('applies invoice discount before due calculation', () => {
        const totals = computeSaleTotals({
            items: [{ qty: 2, price: 50, discount: 0, tax: 0 }],
            invoiceDiscount: 0,
            discountPercent: 10,
            paidAmount: 0,
        });

        expect(totals.total).toBe(90);
        expect(totals.due_amount).toBe(90);
    });

    it('resolves mixed payment when partial paid on credit', () => {
        expect(
            resolvePaymentMethod({
                paymentMethod: 'cash',
                paidAmount: 10,
                dueAmount: 15,
                payments: [],
            })
        ).toBe('mixed');
    });

    it('resolves credit when nothing paid', () => {
        expect(
            resolvePaymentMethod({
                paymentMethod: 'cash',
                paidAmount: 0,
                dueAmount: 25,
                payments: [],
            })
        ).toBe('credit');
    });

    it('computes sale preview footer fields', () => {
        const totals = computeSaleTotals({
            items: [
                { qty: 2, price: 25, discount: 0, tax: 0 },
                { qty: 1, price: 10, discount: 0, tax: 0 },
            ],
            paidAmount: 0,
        });

        const preview = computeSalePreview(totals);
        expect(preview.products_count).toBe(2);
        expect(preview.pieces_count).toBe(3);
        expect(preview.total_with_tax).toBe(60);
    });
});
