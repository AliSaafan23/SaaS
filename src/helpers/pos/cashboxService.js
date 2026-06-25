import { CashboxTransaction } from '../../models/index.js';

export const recordCashboxTransaction = async ({
    type,
    amount,
    saleId = null,
    purchaseId = null,
    expenseId = null,
    customerPaymentId = null,
    supplierPaymentId = null,
    saleReturnId = null,
    description = null,
    transactionDate = new Date(),
    branchId = null,
    transaction,
}) => {
    if (!type) {
        throw new Error('recordCashboxTransaction: type is required');
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error('recordCashboxTransaction: amount must be a positive number');
    }

    const payload = {
        type,
        amount: parsedAmount,
        sale_id: saleId,
        purchase_id: purchaseId,
        expense_id: expenseId,
        customer_payment_id: customerPaymentId,
        supplier_payment_id: supplierPaymentId,
        sale_return_id: saleReturnId,
        description,
        transaction_date: transactionDate,
        branchId,
    };

    if (transaction) {
        return CashboxTransaction.create(payload, { transaction });
    }

    return CashboxTransaction.create(payload);
};

export const recordManualCashboxEntry = async ({
    type,
    amount,
    description,
    transactionDate = new Date(),
    transaction,
}) => {
    if (type !== 'deposit' && type !== 'withdraw') {
        throw new Error('recordManualCashboxEntry: type must be deposit or withdraw');
    }

    return recordCashboxTransaction({
        type,
        amount,
        description,
        transactionDate,
        transaction,
    });
};

export default { recordCashboxTransaction, recordManualCashboxEntry };
