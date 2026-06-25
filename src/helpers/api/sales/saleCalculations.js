export const roundMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
};

export const roundQty = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 10000) / 10000;
};

export const computeLineTotal = ({ qty, price, discount = 0, tax = 0 }) => {
    const q = roundQty(qty);
    const p = roundMoney(price);
    const d = roundMoney(discount);
    const t = roundMoney(tax);
    return Math.max(0, roundMoney(q * p - d + t));
};

/**
 * Sync invoice discount amount ↔ percent (same logic as POS checkout form).
 */
export const syncInvoiceDiscount = ({
    subtotalAfterItems = 0,
    invoiceDiscount = 0,
    discountPercent = 0,
}) => {
    const base = Math.max(0, roundMoney(subtotalAfterItems));
    let amount = roundMoney(invoiceDiscount);
    let percent = roundMoney(discountPercent);

    if (percent > 0 && amount === 0 && base > 0) {
        amount = roundMoney((base * percent) / 100);
    } else if (amount > 0 && percent === 0 && base > 0) {
        percent = roundMoney((amount / base) * 100);
    }

    return { invoice_discount: amount, discount_percent: percent };
};

export const computeSalePreview = (totals) => {
    const items = totals.items || [];
    const piecesCount = roundQty(
        items.reduce((sum, item) => sum + roundQty(item.qty), 0)
    );

    return {
        products_count: items.length,
        pieces_count: piecesCount,
        total_with_tax: totals.total,
    };
};

export const computeSaleTotals = ({
    items = [],
    invoiceDiscount = 0,
    discountPercent = 0,
    paidAmount = 0,
}) => {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let taxAmount = 0;

    const normalizedItems = items.map((item) => {
        const qty = roundQty(item.qty);
        const price = roundMoney(item.price);
        const discount = roundMoney(item.discount ?? 0);
        const tax = roundMoney(item.tax ?? 0);
        const lineSubtotal = roundMoney(qty * price);
        const lineTotal = computeLineTotal({ qty, price, discount, tax });

        subtotal += lineSubtotal;
        itemDiscountTotal += discount;
        taxAmount += tax;

        return {
            ...item,
            qty,
            price,
            discount,
            tax,
            total: lineTotal,
        };
    });

    subtotal = roundMoney(subtotal);
    itemDiscountTotal = roundMoney(itemDiscountTotal);
    taxAmount = roundMoney(taxAmount);

    const grossBeforeInvoiceDiscount = roundMoney(subtotal - itemDiscountTotal + taxAmount);
    const synced = syncInvoiceDiscount({
        subtotalAfterItems: grossBeforeInvoiceDiscount,
        invoiceDiscount,
        discountPercent,
    });

    const total = Math.max(
        0,
        roundMoney(grossBeforeInvoiceDiscount - synced.invoice_discount)
    );
    const paid = roundMoney(paidAmount);
    const due = Math.max(0, roundMoney(total - paid));

    return {
        items: normalizedItems,
        subtotal,
        item_discount: itemDiscountTotal,
        invoice_discount: synced.invoice_discount,
        discount_percent: synced.discount_percent,
        tax_amount: taxAmount,
        total,
        paid_amount: paid,
        due_amount: due,
    };
};

export const resolvePaymentMethod = ({ paymentMethod, paidAmount, dueAmount, payments = [] }) => {
    const paid = roundMoney(paidAmount);
    const due = roundMoney(dueAmount);

    if (payments.length > 1) return 'mixed';
    if (due > 0 && paid > 0) return 'mixed';
    if (due > 0 && paid === 0) return 'credit';
    if (payments.length === 1) return payments[0].method;
    return paymentMethod || 'cash';
};

export default {
    roundMoney,
    roundQty,
    computeLineTotal,
    syncInvoiceDiscount,
    computeSaleTotals,
    computeSalePreview,
    resolvePaymentMethod,
};
