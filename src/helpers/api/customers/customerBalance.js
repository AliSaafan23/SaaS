import { Op } from 'sequelize';
import { Sale } from '../../../models/index.js';
import { roundMoney } from '../sales/saleCalculations.js';

export const parseDecimal = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(typeof value === 'object' && value?.toString ? value.toString() : value);
    return Number.isFinite(n) ? n : fallback;
};

/** Positive = عليه (customer owes), negative = له (we owe customer). */
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

const sumCreditSalesDue = async (customerId, branchId, { transaction } = {}) => {
    const total = await Sale.sum('due_amount', {
        where: {
            customer_id: customerId,
            branchId,
            status: 'completed',
            due_amount: { [Op.gt]: 0 },
        },
        transaction,
    });
    return parseDecimal(total);
};

/**
 * Apply a customer payment to open credit invoices (FIFO), then opening debit.
 * Updates sale.paid_amount / sale.due_amount and customer.opening_balance in place.
 */
export const applyCustomerPaymentAllocation = async ({
    customer,
    branchId,
    amount,
    transaction,
}) => {
    let remaining = roundMoney(amount);

    const openSales = await Sale.findAll({
        where: {
            customer_id: customer.id,
            branchId,
            status: 'completed',
            due_amount: { [Op.gt]: 0 },
        },
        order: [
            ['invoice_date', 'ASC'],
            ['id', 'ASC'],
        ],
        transaction,
    });

    for (const sale of openSales) {
        if (remaining <= 0) break;

        const due = roundMoney(sale.due_amount);
        const allocate = Math.min(remaining, due);
        if (allocate <= 0) continue;

        await sale.update(
            {
                paid_amount: roundMoney(parseDecimal(sale.paid_amount) + allocate),
                due_amount: roundMoney(due - allocate),
            },
            { transaction }
        );

        remaining = roundMoney(remaining - allocate);
    }

    if (remaining > 0) {
        const opening = parseDecimal(customer.opening_balance);
        if (opening > 0) {
            const reduce = Math.min(remaining, opening);
            await customer.update(
                { opening_balance: roundMoney(opening - reduce) },
                { transaction }
            );
            remaining = roundMoney(remaining - reduce);
        }
    }

    return {
        allocatedAmount: roundMoney(amount - remaining),
        unallocatedAmount: remaining,
    };
};

/**
 * Outstanding balance from live sale due amounts + opening debit on the customer.
 * Customer payments are applied to invoices/opening at payment time (see applyCustomerPaymentAllocation).
 */
export const computeCustomerReceivables = async (customer, branchId, { transaction } = {}) => {
    const openingDebit = Math.max(0, parseDecimal(customer.opening_balance));
    const creditInvoicesDue = await sumCreditSalesDue(customer.id, branchId, { transaction });
    const total = roundMoney(creditInvoicesDue + openingDebit);

    return {
        remaining_opening_balance: openingDebit,
        remaining_credit_invoices: creditInvoicesDue,
        total,
    };
};

export default {
    parseDecimal,
    splitOpeningBalance,
    mergeOpeningBalance,
    applyCustomerPaymentAllocation,
    computeCustomerReceivables,
};
