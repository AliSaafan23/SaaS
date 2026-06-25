const parseNum = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const splitList = (value) => {
    if (value === undefined || value === null || value === '') return [];
    return String(value)
        .split(/[,|]/)
        .map((part) => part.trim())
        .filter(Boolean);
};

/**
 * Postman x-www-form-urlencoded shapes:
 * - items[0][saleItemId]=12&items[0][qty]=1
 * - saleItemId=12&qty=1
 * - saleItemId=12,13&qty=1,2
 * - productId=5&qty=1  (resolved to sale line when unique on invoice)
 */
export const normalizeSaleReturnItemsFromBody = (body = {}) => {
    if (Array.isArray(body.items) && body.items.length > 0) {
        return body.items.map((item) => ({
            saleItemId: parseNum(item.saleItemId ?? item.sale_item_id),
            sale_item_id: parseNum(item.sale_item_id ?? item.saleItemId),
            productId: parseNum(item.productId ?? item.product_id),
            product_id: parseNum(item.product_id ?? item.productId),
            qty: parseNum(item.qty ?? item.quantity),
        }));
    }

    const saleItemRaw = body.saleItemId ?? body.sale_item_id;
    const productRaw = body.productId ?? body.product_id;
    const qtyRaw = body.qty ?? body.quantity;

    if (
        (saleItemRaw == null || saleItemRaw === '') &&
        (productRaw == null || productRaw === '')
    ) {
        return [];
    }

    if (qtyRaw == null || qtyRaw === '') return [];

    const saleItemParts = splitList(saleItemRaw);
    const productParts = splitList(productRaw);
    const qtyParts = splitList(qtyRaw);
    const count = Math.max(saleItemParts.length, productParts.length, qtyParts.length, 1);

    const items = [];
    for (let i = 0; i < count; i += 1) {
        const qty = parseNum(qtyParts[i] ?? qtyParts[0]);
        if (!qty) continue;

        const saleItemId = parseNum(saleItemParts[i] ?? saleItemParts[0]);
        const productId = parseNum(productParts[i] ?? productParts[0]);

        const item = { qty };
        if (saleItemId) {
            item.saleItemId = saleItemId;
            item.sale_item_id = saleItemId;
        }
        if (productId) {
            item.productId = productId;
            item.product_id = productId;
        }
        if (item.saleItemId || item.productId) items.push(item);
    }

    return items;
};

export const normalizeSaleReturnRequestBody = (body = {}) => {
    const next = { ...body };

    if (next.sale_id != null && next.sale_id !== '' && !next.saleId) {
        next.saleId = next.sale_id;
    }

    const items = normalizeSaleReturnItemsFromBody(next);
    if (items.length > 0) {
        next.items = items;
    }

    return next;
};

export default {
    normalizeSaleReturnItemsFromBody,
    normalizeSaleReturnRequestBody,
};
