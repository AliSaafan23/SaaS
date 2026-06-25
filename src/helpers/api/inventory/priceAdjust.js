/**
 * Bulk price adjustment rules (Flutter: تعديل أسعار المنتجات).
 */

const roundPrice = (value) => Math.round(Number(value) * 100) / 100;

const parseNum = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const SALE_LEVEL_FIELDS = {
    1: 'sale_price_1',
    2: 'sale_price_2',
    3: 'sale_price_3',
};

/**
 * @param {number} currentPrice
 * @param {{ direction: string, method: string, value: number, costPrice?: number }} options
 */
export const computeAdjustedPrice = (currentPrice, { direction, method, value, costPrice = 0 }) => {
    const current = parseNum(currentPrice);
    const val = parseNum(value);
    const cost = parseNum(costPrice);

    if (method === 'exchange_rate') {
        return roundPrice(Math.max(0, cost * val));
    }

    const sign = direction === 'decrease' ? -1 : 1;

    if (method === 'percentage') {
        return roundPrice(Math.max(0, current + sign * ((current * val) / 100)));
    }

    if (method === 'fixed_amount') {
        return roundPrice(Math.max(0, current + sign * val));
    }

    return current;
};

export const resolveTargetPriceFields = ({ priceType, salePriceLevels = [] }) => {
    if (priceType === 'purchase') {
        return ['cost_price'];
    }

    const levels = [...new Set(salePriceLevels.map(Number))].filter((l) => SALE_LEVEL_FIELDS[l]);
    return levels.map((l) => SALE_LEVEL_FIELDS[l]);
};

/** Accept JSON array, form-urlencoded "1", or "1,2,3". */
export const normalizeSalePriceLevels = (value) => {
    if (value === undefined || value === null || value === '') return undefined;

    if (Array.isArray(value)) {
        return [...new Set(value.map(Number))].filter((l) => SALE_LEVEL_FIELDS[l]);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return [...new Set(parsed.map(Number))].filter((l) => SALE_LEVEL_FIELDS[l]);
                }
            } catch {
                /* fall through */
            }
        }
        return [...new Set(trimmed.split(/[,|]/).map((s) => Number(s.trim())))].filter(
            (l) => SALE_LEVEL_FIELDS[l]
        );
    }

    const single = Number(value);
    if (SALE_LEVEL_FIELDS[single]) return [single];
    return undefined;
};

export default {
    computeAdjustedPrice,
    resolveTargetPriceFields,
    normalizeSalePriceLevels,
    SALE_LEVEL_FIELDS,
};
