import { describe, it, expect } from 'vitest';
import { computeFullyReturned } from '../../src/helpers/api/sales/saleReturnObject.js';

describe('computeFullyReturned', () => {
    it('is true when every line net qty is zero', () => {
        const sale = {
            items: [
                { id: 1, qty: 2 },
                { id: 2, qty: 1 },
            ],
        };
        const map = { 1: 2, 2: 1 };
        expect(computeFullyReturned(sale, map)).toBe(true);
    });

    it('is false when any line still has returnable qty', () => {
        const sale = { items: [{ id: 1, qty: 3 }] };
        expect(computeFullyReturned(sale, { 1: 2 })).toBe(false);
    });
});
