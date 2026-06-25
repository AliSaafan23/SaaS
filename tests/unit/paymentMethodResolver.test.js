import { describe, it, expect } from 'vitest';
import {
    normalizeTotalsForCreditPayment,
    planPaymentRows,
} from '../../src/helpers/api/sales/paymentMethodResolver.js';
import { SaleScopeError } from '../../src/helpers/api/sales/saleErrors.js';

const creditMethod = { id: 2, code: 'credit', requiresCustomer: true, affectsCashbox: false };
const cashMethod = { id: 1, code: 'cash', requiresCustomer: false, affectsCashbox: true };

describe('normalizeTotalsForCreditPayment', () => {
    it('converts full credit when client sends paidAmount = total', () => {
        const totals = {
            total: 37.5,
            paid_amount: 37.5,
            due_amount: 0,
            subtotal: 50,
        };

        const out = normalizeTotalsForCreditPayment(totals, creditMethod);
        expect(out.paid_amount).toBe(0);
        expect(out.due_amount).toBe(37.5);
    });

    it('keeps partial credit when paid < total', () => {
        const totals = {
            total: 37.5,
            paid_amount: 10,
            due_amount: 27.5,
        };

        const out = normalizeTotalsForCreditPayment(totals, creditMethod);
        expect(out.paid_amount).toBe(10);
        expect(out.due_amount).toBe(27.5);
    });

    it('does not change cash sales', () => {
        const totals = { total: 50, paid_amount: 50, due_amount: 0 };
        const out = normalizeTotalsForCreditPayment(totals, { code: 'cash' });
        expect(out.paid_amount).toBe(50);
        expect(out.due_amount).toBe(0);
    });
});

describe('planPaymentRows', () => {
    it('rejects cash with paidAmount 0', () => {
        expect(() =>
            planPaymentRows(
                cashMethod,
                { total: 117.5, paid_amount: 0, due_amount: 117.5 },
                creditMethod
            )
        ).toThrow(SaleScopeError);
    });

    it('splits partial cash into cash + credit rows', () => {
        const rows = planPaymentRows(
            cashMethod,
            { total: 117.5, paid_amount: 50, due_amount: 67.5 },
            creditMethod
        );
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ method: cashMethod, amount: 50 });
        expect(rows[1]).toMatchObject({ method: creditMethod, amount: 67.5 });
    });

    it('allows full credit with paidAmount 0', () => {
        const rows = planPaymentRows(
            creditMethod,
            { total: 117.5, paid_amount: 0, due_amount: 117.5 },
            creditMethod
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ method: creditMethod, amount: 117.5 });
    });

    it('records full cash when paid equals total', () => {
        const rows = planPaymentRows(
            cashMethod,
            { total: 117.5, paid_amount: 117.5, due_amount: 0 },
            creditMethod
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ method: cashMethod, amount: 117.5 });
    });
});
