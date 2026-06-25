import { Op } from 'sequelize';
import { Purchase, SupplierPayment } from '../../../models/index.js';

export const parseDecimal = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(typeof value === 'object' && value?.toString ? value.toString() : value);
    return Number.isFinite(n) ? n : fallback;
};

/** Positive = عليه (supplier owes shop), negative = له (shop owes supplier). */
export const splitOpeningBalance = (openingBalance) => {
    const balance = parseDecimal(openingBalance);
    return {
        opening_credit: balance < 0 ? Math.abs(balance) : 0,
        opening_debit: balance > 0 ? balance : 0,
    };
};

export const mergeOpeningBalance = ({ opening_credit, opening_debit } = {}) => {
    const credit = Math.max(0, parseDecimal(opening_credit));
    const debit = Math.max(0, parseDecimal(opening_debit));
    if (credit > 0 && debit > 0) {
        return { error: 'openingBalanceConflict' };
    }
    if (debit > 0) return { opening_balance: debit };
    if (credit > 0) return { opening_balance: -credit };
    return { opening_balance: 0 };
};

const sumCreditPurchasesDue = async (supplierId, branchId) => {
    const total = await Purchase.sum('due_amount', {
        where: {
            supplier_id: supplierId,
            branchId,
            status: 'completed',
            due_amount: { [Op.gt]: 0 },
        },
    });
    return parseDecimal(total);
};

const sumSupplierPayments = async (supplierId) => {
    const total = await SupplierPayment.sum('amount', {
        where: { supplier_id: supplierId },
    });
    return parseDecimal(total);
};

/**
 * Payments apply to credit purchases first, then opening balance owed to supplier (له).
 */
export const computeSupplierPayables = async (supplier, branchId) => {
    const raw = parseDecimal(supplier.opening_balance);
    const openingWeOwe = Math.max(0, -raw);
    const openingTheyOwe = Math.max(0, raw);

    const creditPurchasesDue = await sumCreditPurchasesDue(supplier.id, branchId);
    const payments = await sumSupplierPayments(supplier.id);

    const remainingCreditPurchases = Math.max(0, creditPurchasesDue - payments);
    const paymentsAfterPurchases = Math.max(0, payments - creditPurchasesDue);
    const remainingOpeningWeOwe = Math.max(0, openingWeOwe - paymentsAfterPurchases);

    const totalPayable = remainingOpeningWeOwe + remainingCreditPurchases;
    const total = Math.max(0, totalPayable - openingTheyOwe);

    return {
        remaining_opening_balance: remainingOpeningWeOwe,
        remaining_credit_invoices: remainingCreditPurchases,
        total,
    };
};

export default {
    parseDecimal,
    splitOpeningBalance,
    mergeOpeningBalance,
    computeSupplierPayables,
};
