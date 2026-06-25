import { describe, it, expect } from 'vitest';
import {
    normalizeSaleItemsFromBody,
    normalizeSaleRequestBody,
} from '../../src/helpers/api/sales/saleBodyNormalize.js';

describe('saleBodyNormalize', () => {
    it('wraps flat productId/qty/price into items[]', () => {
        const items = normalizeSaleItemsFromBody({
            productId: '5',
            qty: '2',
            price: '25',
        });

        expect(items).toEqual([
            { productId: 5, product_id: 5, qty: 2, price: 25 },
        ]);
    });

    it('keeps existing items array', () => {
        const items = normalizeSaleItemsFromBody({
            items: [{ productId: 3, qty: 1, price: 10 }],
        });

        expect(items).toHaveLength(1);
        expect(items[0].productId).toBe(3);
    });

    it('supports parallel comma-separated lists', () => {
        const items = normalizeSaleItemsFromBody({
            productId: '5,8',
            qty: '2,1',
            price: '25,10',
        });

        expect(items).toEqual([
            { productId: 5, product_id: 5, qty: 2, price: 25 },
            { productId: 8, product_id: 8, qty: 1, price: 10 },
        ]);
    });

    it('normalizes full request body', () => {
        const body = normalizeSaleRequestBody({
            productId: 5,
            qty: 1,
            paidAmount: 25,
            paymentMethod: 'cash',
        });

        expect(body.items).toHaveLength(1);
        expect(body.paidAmount).toBe(25);
        expect(body.paymentMethod).toBe('cash');
    });
});
