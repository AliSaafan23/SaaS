import { roundMoney, roundQty } from './saleCalculations.js';

export const sumSaleItemsGross = (saleItems = []) =>
    roundMoney(
        saleItems.reduce((sum, item) => sum + roundMoney(item.total), 0)
    );

/**
 * Return value based on current sale balance and share of remaining returnable lines.
 * Works for first and subsequent partial returns on the same invoice.
 */
export const computeReturnTotal = ({
    currentSaleTotal,
    returnLinesGross,
    remainingReturnableGross,
}) => {
    const sale = roundMoney(currentSaleTotal);
    const returned = roundMoney(returnLinesGross);
    const remaining = roundMoney(remainingReturnableGross);

    if (returned <= 0 || sale <= 0) return 0;
    if (remaining <= 0) return Math.min(sale, returned);

    return Math.min(sale, roundMoney(sale * (returned / remaining)));
};

/** @deprecated Use computeReturnTotal — kept for tests comparing legacy ratio */
export const computeReturnTotalFromLines = (saleTotal, itemsGross, returnLinesGross) =>
    computeReturnTotal({
        currentSaleTotal: saleTotal,
        returnLinesGross,
        remainingReturnableGross: itemsGross,
    });

export const computeRemainingReturnableGross = (saleItems, returnedQtyMap, returningSaleItemIds) => {
    const idSet = new Set(returningSaleItemIds);
    let total = 0;

    for (const saleItem of saleItems || []) {
        if (!idSet.has(saleItem.id)) continue;

        const soldQty = roundQty(saleItem.qty);
        const alreadyReturned = roundQty(returnedQtyMap[saleItem.id] || 0);
        const returnableQty = roundQty(soldQty - alreadyReturned);
        if (returnableQty <= 0) continue;

        total += computeUnitLineTotal(saleItem) * returnableQty;
    }

    return roundMoney(total);
};

export const computeUnitLineTotal = (saleItem) => {
    const qty = roundQty(saleItem.qty);
    if (qty <= 0) return 0;
    return roundMoney(roundMoney(saleItem.total) / qty);
};

export const buildReturnLineFromSaleItem = (saleItem, returnQty) => {
    const qty = roundQty(returnQty);
    const unitTotal = computeUnitLineTotal(saleItem);
    const lineGross = roundMoney(unitTotal * qty);

    return {
        sale_item_id: saleItem.id,
        product_id: saleItem.product_id,
        qty,
        price: roundMoney(saleItem.price),
        discount: roundMoney((roundMoney(saleItem.discount) / roundQty(saleItem.qty)) * qty),
        tax: roundMoney((roundMoney(saleItem.tax) / roundQty(saleItem.qty)) * qty),
        total: lineGross,
    };
};

/**
 * Split refund: reduce customer due first, then refund cash from drawer.
 */
export const computeRefundSplit = (sale, returnTotal, payments = []) => {
    const paid = roundMoney(sale.paid_amount);
    const due = roundMoney(sale.due_amount);
    const refund = roundMoney(returnTotal);
    const total = roundMoney(sale.total);

    if (refund <= 0) {
        return { cashRefund: 0, creditRefund: 0, methodRefunds: [] };
    }

    if (total <= 0) {
        return { cashRefund: 0, creditRefund: refund, methodRefunds: [] };
    }

    const creditRefund = Math.min(refund, due);
    const cashRefund = Math.min(roundMoney(refund - creditRefund), paid);

    const cashPayments = payments.filter((row) => row.paymentMethod?.affectsCashbox);
    const cashPaidTotal = roundMoney(
        cashPayments.reduce((sum, row) => sum + roundMoney(row.amount), 0)
    );

    const methodRefunds = [];
    if (cashRefund > 0 && cashPaidTotal > 0) {
        let allocated = 0;
        for (let i = 0; i < cashPayments.length; i += 1) {
            const row = cashPayments[i];
            const rowAmount = roundMoney(row.amount);
            let share;
            if (i === cashPayments.length - 1) {
                share = roundMoney(cashRefund - allocated);
            } else {
                share = roundMoney(cashRefund * (rowAmount / cashPaidTotal));
                allocated = roundMoney(allocated + share);
            }
            if (share > 0) {
                methodRefunds.push({
                    paymentMethodId: row.payment_method_id,
                    method: row.paymentMethod,
                    amount: share,
                });
            }
        }
    }

    return { cashRefund, creditRefund, methodRefunds };
};

/**
 * Reduce sale payment rows after a return (credit due / cash collected portions).
 */
export const computeUpdatedPaymentAmounts = (payments = [], { cashRefund, creditRefund }) => {
    let creditLeft = roundMoney(creditRefund);
    let cashLeft = roundMoney(cashRefund);

    const creditRows = payments.filter(
        (row) => row.payment_method === 'credit' || !row.paymentMethod?.affectsCashbox
    );
    const cashRows = payments.filter((row) => row.paymentMethod?.affectsCashbox);

    const updates = [];

    for (const row of creditRows) {
        if (creditLeft <= 0) break;
        const current = roundMoney(row.amount);
        const reduce = Math.min(creditLeft, current);
        if (reduce <= 0) continue;
        updates.push({ id: row.id, amount: roundMoney(current - reduce) });
        creditLeft = roundMoney(creditLeft - reduce);
    }

    for (const row of cashRows) {
        if (cashLeft <= 0) break;
        const current = roundMoney(row.amount);
        const reduce = Math.min(cashLeft, current);
        if (reduce <= 0) continue;
        updates.push({ id: row.id, amount: roundMoney(current - reduce) });
        cashLeft = roundMoney(cashLeft - reduce);
    }

    return updates;
};

export const computeUpdatedSaleAmounts = (sale, returnTotal, { cashRefund, creditRefund }) => {
    const newTotal = Math.max(0, roundMoney(sale.total) - roundMoney(returnTotal));
    const newPaid = Math.max(0, roundMoney(sale.paid_amount) - roundMoney(cashRefund));
    const newDue = Math.max(0, roundMoney(sale.due_amount) - roundMoney(creditRefund));

    return {
        total: newTotal,
        paid_amount: newPaid,
        due_amount: newDue,
    };
};

export default {
    sumSaleItemsGross,
    computeReturnTotal,
    computeReturnTotalFromLines,
    computeRemainingReturnableGross,
    computeUnitLineTotal,
    buildReturnLineFromSaleItem,
    computeRefundSplit,
    computeUpdatedPaymentAmounts,
    computeUpdatedSaleAmounts,
};
