import { PaymentMethod } from '../../../models/index.js';
import { SaleScopeError } from './saleErrors.js';
import { roundMoney } from './saleCalculations.js';

export const getActivePaymentMethod = async (id) => {
    const methodId = Number(id);
    if (!Number.isFinite(methodId) || methodId < 1) {
        throw new SaleScopeError('paymentMethodNotFound');
    }

    const method = await PaymentMethod.findOne({
        where: { id: methodId, isActive: true },
    });

    if (!method) throw new SaleScopeError('paymentMethodNotFound');
    return method;
};

export const getPaymentMethodByCode = async (code) => {
    const method = await PaymentMethod.findOne({
        where: { code, isActive: true },
    });
    if (!method) throw new SaleScopeError('paymentMethodNotFound');
    return method;
};

const legacyCodeFromMethod = (method) => {
    const code = method?.code;
    if (['cash', 'card', 'credit', 'cheque'].includes(code)) return code;
    return 'cash';
};

export const normalizeTotalsForCreditPayment = (totals, primaryMethod, { hasSplitPayments = false } = {}) => {
    if (!primaryMethod || primaryMethod.code !== 'credit' || hasSplitPayments) {
        return totals;
    }

    const total = roundMoney(totals.total);
    const paid = roundMoney(totals.paid_amount);
    const due = roundMoney(totals.due_amount);

    // Full credit: client may send paidAmount = total by mistake — nothing collected now.
    if (total > 0 && due <= 0 && paid >= total) {
        return {
            ...totals,
            paid_amount: 0,
            due_amount: total,
        };
    }

    return totals;
};

/**
 * Build payment rows for a single primary method (no explicit split array).
 */
export const planPaymentRows = (primary, totals, creditMethod) => {
    const paid = roundMoney(totals.paid_amount);
    const due = roundMoney(totals.due_amount);
    const total = roundMoney(totals.total);
    const rows = [];

    if (total > 0 && paid === 0 && primary.affectsCashbox) {
        throw new SaleScopeError('cashPaymentRequiresPaidAmount');
    }

    if (due > 0 && paid > 0) {
        rows.push({ method: primary, amount: paid });
        const credit = primary.code === 'credit' ? primary : creditMethod;
        rows.push({ method: credit, amount: due });
    } else if (due > 0 && paid === 0) {
        rows.push({ method: primary, amount: total });
    } else {
        rows.push({ method: primary, amount: paid > 0 ? paid : total });
    }

    return rows;
};

/**
 * Build sale payment rows from paymentMethodId (+ optional split payments).
 */
export const resolveSalePaymentPlan = async ({
    paymentMethodId,
    payments = [],
    totals,
}) => {
    const paid = roundMoney(totals.paid_amount);
    const due = roundMoney(totals.due_amount);

    let rows = [];

    if (payments.length > 0) {
        for (const row of payments) {
            const method = await getActivePaymentMethod(row.paymentMethodId ?? row.payment_method_id);
            const amount = roundMoney(row.amount);
            if (amount <= 0) continue;
            rows.push({ method, amount });
        }
    } else {
        const primary = await getActivePaymentMethod(paymentMethodId);
        const creditMethod =
            primary.code === 'credit' ? primary : await getPaymentMethodByCode('credit');
        rows = planPaymentRows(primary, totals, creditMethod);
    }

    if (!rows.length) throw new SaleScopeError('paymentMethodRequired');

    const primaryMethod = rows[0].method;
    const isMixed = rows.length > 1 || (due > 0 && paid > 0);
    const legacyCode = isMixed ? 'mixed' : legacyCodeFromMethod(primaryMethod);

    return {
        primaryMethod,
        primaryMethodId: primaryMethod.id,
        legacyCode,
        isMixed,
        rows,
    };
};

export const assertPaymentCustomerRules = (customer, paymentPlan) => {
    const needsCustomer =
        paymentPlan.rows.some((row) => row.method.requiresCustomer) ||
        paymentPlan.rows.some((row) => row.method.code === 'credit');

    if (needsCustomer && !customer) {
        throw new SaleScopeError('customerRequiredForCredit');
    }
};

export default {
    getActivePaymentMethod,
    getPaymentMethodByCode,
    normalizeTotalsForCreditPayment,
    planPaymentRows,
    resolveSalePaymentPlan,
    assertPaymentCustomerRules,
};
