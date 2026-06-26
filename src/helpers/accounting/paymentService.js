import { sequelize, Invoice, Payment } from '../../models/index.js';
import { ACCOUNT_CODES } from '../../config/accountCodes.js';
import { toMoney } from '../../utils/money.js';
import { postJournalByCodes } from './accountingService.js';

export const recordPayment = async ({ tenantId, invoiceId, amount, paymentDate }) => {
    const payAmount = toMoney(amount);

    return sequelize.transaction(async (transaction) => {
        const invoice = await Invoice.findOne({
            where: { id: invoiceId, tenantId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!invoice) {
            const err = new Error('invoiceNotFound');
            err.code = 'invoiceNotFound';
            throw err;
        }
        if (invoice.status === 'paid') {
            const err = new Error('invoiceAlreadyPaid');
            err.code = 'invoiceAlreadyPaid';
            throw err;
        }
        if (payAmount !== toMoney(invoice.amount)) {
            const err = new Error('paymentAmountMismatch');
            err.code = 'paymentAmountMismatch';
            throw err;
        }

        const payment = await Payment.create(
            { tenantId, invoiceId: invoice.id, amount: payAmount, paymentDate },
            { transaction }
        );

        await postJournalByCodes({
            tenantId,
            entryDate: paymentDate,
            description: `Payment for invoice #${invoice.id}`,
            referenceType: 'payment',
            referenceId: payment.id,
            lines: [
                { code: ACCOUNT_CODES.CASH, debit: payAmount, credit: 0 },
                { code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: 0, credit: payAmount },
            ],
            transaction,
        });

        await invoice.update({ status: 'paid' }, { transaction });

        return { payment, invoice };
    });
};
