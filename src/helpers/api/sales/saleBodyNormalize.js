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
 * Build sale line items from flat or list form fields (Postman x-www-form-urlencoded).
 *
 * Supported shapes:
 * - items[0][productId]=5&items[0][qty]=2  (extended urlencoded — already an array)
 * - productId=5&qty=2&price=25              (single line)
 * - productId=5,8&qty=2,1&price=25,10       (parallel lists)
 */
export const normalizeSaleItemsFromBody = (body = {}) => {
    if (Array.isArray(body.items) && body.items.length > 0) {
        return body.items.map((item) => ({
            productId: parseNum(item.productId ?? item.product_id),
            product_id: parseNum(item.product_id ?? item.productId),
            qty: parseNum(item.qty ?? item.quantity),
            price: parseNum(item.price),
            discount: parseNum(item.discount),
            tax: parseNum(item.tax),
        }));
    }

    const productRaw = body.productId ?? body.product_id;
    const qtyRaw = body.qty ?? body.quantity;

    if (productRaw == null || productRaw === '' || qtyRaw == null || qtyRaw === '') {
        return [];
    }

    const productParts = splitList(productRaw);
    const qtyParts = splitList(qtyRaw);
    const priceParts = splitList(body.price);
    const discountParts = splitList(body.discount);
    const taxParts = splitList(body.tax);

    const count = Math.max(productParts.length, qtyParts.length, 1);

    const items = [];
    for (let i = 0; i < count; i += 1) {
        const productId = parseNum(productParts[i] ?? productParts[0]);
        const qty = parseNum(qtyParts[i] ?? qtyParts[0]);
        if (!productId || !qty) continue;

        const item = { productId, product_id: productId, qty };
        const price = parseNum(priceParts[i] ?? priceParts[0]);
        const discount = parseNum(discountParts[i] ?? discountParts[0]);
        const tax = parseNum(taxParts[i] ?? taxParts[0]);
        if (price != null) item.price = price;
        if (discount != null) item.discount = discount;
        if (tax != null) item.tax = tax;
        items.push(item);
    }

    return items;
};

export const normalizeSaleRequestBody = (body = {}) => {
    const next = { ...body };

    if (next.discount_percent != null && next.discount_percent !== '' && !next.discountPercent) {
        next.discountPercent = next.discount_percent;
    }
    if (next.invoice_discount != null && next.invoice_discount !== '' && !next.invoiceDiscount) {
        next.invoiceDiscount = next.invoice_discount;
    }
    if (next.paid_amount != null && next.paid_amount !== '' && !next.paidAmount) {
        next.paidAmount = next.paid_amount;
    }
    if (next.sale_price_type != null && next.sale_price_type !== '' && !next.salePriceType) {
        next.salePriceType = next.sale_price_type;
    }
    if (next.payment_method_id != null && next.payment_method_id !== '' && !next.paymentMethodId) {
        next.paymentMethodId = next.payment_method_id;
    }
    if (next.payment_method != null && next.payment_method !== '' && !next.paymentMethod) {
        next.paymentMethod = next.payment_method;
    }
    if (next.customer_id != null && next.customer_id !== '' && !next.customerId) {
        next.customerId = next.customer_id;
    }

    const items = normalizeSaleItemsFromBody(next);
    if (items.length > 0) {
        next.items = items;
    }
    return next;
};

export default { normalizeSaleItemsFromBody, normalizeSaleRequestBody };
