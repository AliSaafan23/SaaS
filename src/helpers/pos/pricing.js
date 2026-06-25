const PRICE_LEVEL_FIELDS = Object.freeze({
    1: 'sale_price_1',
    2: 'sale_price_2',
    3: 'sale_price_3',
});

const DEFAULT_PRICE_LEVEL = 1;

/**
 * Normalize price level to 1 | 2 | 3.
 * @param {number|string|null|undefined} level
 * @returns {1|2|3}
 */
export const normalizePriceLevel = (level) => {
    const parsed = Number(level);
    if (parsed === 2 || parsed === 3) return parsed;
    return DEFAULT_PRICE_LEVEL;
};

/**
 * Resolve which price level to use for a sale.
 * Explicit salePriceType on the invoice wins; otherwise use customer price_level.
 *
 * @param {{ salePriceType?: number, customerPriceLevel?: number }} options
 * @returns {1|2|3}
 */
export const resolveSalePriceLevel = ({ salePriceType, customerPriceLevel } = {}) => {
    if (salePriceType != null) {
        return normalizePriceLevel(salePriceType);
    }
    return normalizePriceLevel(customerPriceLevel);
};

/**
 * Get the sale unit price for a product at the given level.
 *
 * @param {object} product - Product instance or plain object with sale_price_1/2/3
 * @param {number} priceLevel - 1, 2, or 3
 * @returns {number}
 */
export const getProductSalePrice = (product, priceLevel = DEFAULT_PRICE_LEVEL) => {
    const level = normalizePriceLevel(priceLevel);
    const field = PRICE_LEVEL_FIELDS[level];
    return Number(product[field] ?? product.sale_price_1 ?? 0);
};

/**
 * Field name on Product for a given price level (e.g. sale_price_2).
 */
export const getSalePriceField = (priceLevel) =>
    PRICE_LEVEL_FIELDS[normalizePriceLevel(priceLevel)];
