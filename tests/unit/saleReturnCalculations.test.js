import { describe, it, expect } from 'vitest';
import {
    computeReturnTotal,
    computeReturnTotalFromLines,
    computeRefundSplit,
    computeUpdatedSaleAmounts,
    computeUpdatedPaymentAmounts,
    buildReturnLineFromSaleItem,
} from '../../src/helpers/api/sales/saleReturnCalculations.js';

describe('saleReturnCalculations', () => {
    it('applies invoice discount proportionally on first partial return', () => {
        const total = computeReturnTotalFromLines(90, 100, 50);
        expect(total).toBe(45);
    });

    it('second partial return consumes remaining sale balance', () => {
        const total = computeReturnTotal({
            currentSaleTotal: 18.75,
            returnLinesGross: 21.25,
            remainingReturnableGross: 21.25,
        });
        expect(total).toBe(18.75);
    });

    it('matches user credit invoice scenario on first return', () => {
        const total = computeReturnTotal({
            currentSaleTotal: 37.5,
            returnLinesGross: 21.25,
            remainingReturnableGross: 42.5,
        });
        expect(total).toBe(18.75);
    });

    it('builds return line from sale item unit economics', () => {
        const line = buildReturnLineFromSaleItem(
            { id: 1, product_id: 5, qty: 4, price: 10, discount: 4, tax: 0, total: 36 },
            2
        );
        expect(line.qty).toBe(2);
        expect(line.total).toBe(18);
        expect(line.discount).toBe(2);
    });

    it('applies return to outstanding due before cash refund', () => {
        const sale = { total: 200, paid_amount: 100, due_amount: 100 };
        const payments = [
            { payment_method_id: 1, amount: 100, paymentMethod: { affectsCashbox: true, code: 'cash' } },
            { payment_method_id: 2, amount: 100, paymentMethod: { affectsCashbox: false, code: 'credit' } },
        ];
        const refund = computeRefundSplit(sale, 50, payments);
        expect(refund.cashRefund).toBe(0);
        expect(refund.creditRefund).toBe(50);
        expect(refund.methodRefunds).toHaveLength(0);
    });

    it('clears due when return equals outstanding balance', () => {
        const sale = { total: 125, paid_amount: 100, due_amount: 25 };
        const payments = [
            { payment_method_id: 1, amount: 100, paymentMethod: { affectsCashbox: true, code: 'cash' } },
            { payment_method_id: 2, amount: 25, paymentMethod: { affectsCashbox: false, code: 'credit' } },
        ];
        const refund = computeRefundSplit(sale, 25, payments);
        expect(refund.cashRefund).toBe(0);
        expect(refund.creditRefund).toBe(25);

        const updated = computeUpdatedSaleAmounts(sale, 25, refund);
        expect(updated.total).toBe(100);
        expect(updated.paid_amount).toBe(100);
        expect(updated.due_amount).toBe(0);
    });

    it('refunds cash only when invoice has no due balance', () => {
        const sale = { total: 125, paid_amount: 125, due_amount: 0 };
        const payments = [
            { payment_method_id: 1, amount: 125, paymentMethod: { affectsCashbox: true, code: 'cash' } },
        ];
        const refund = computeRefundSplit(sale, 25, payments);
        expect(refund.cashRefund).toBe(25);
        expect(refund.creditRefund).toBe(0);
        expect(refund.methodRefunds[0].amount).toBe(25);
    });

    it('updates sale totals consistently after return', () => {
        const sale = { total: 200, paid_amount: 120, due_amount: 80 };
        const updated = computeUpdatedSaleAmounts(sale, 50, {
            cashRefund: 30,
            creditRefund: 20,
        });
        expect(updated.total).toBe(150);
        expect(updated.paid_amount).toBe(90);
        expect(updated.due_amount).toBe(60);
        expect(updated.paid_amount + updated.due_amount).toBe(updated.total);
    });

    it('reduces credit payment row after credit return', () => {
        const updates = computeUpdatedPaymentAmounts(
            [
                {
                    id: 24,
                    payment_method: 'credit',
                    amount: 37.5,
                    paymentMethod: { affectsCashbox: false, code: 'credit' },
                },
            ],
            { cashRefund: 0, creditRefund: 18.75 }
        );
        expect(updates).toEqual([{ id: 24, amount: 18.75 }]);
    });
});
