import { Op } from 'sequelize';
import { sequelize, Invoice } from '../../models/index.js';
import { ACCOUNT_CODES } from '../../config/accountCodes.js';
import { toMoney } from '../../utils/money.js';
import { postJournalByCodes } from './accountingService.js';

export const runRevenueRecognition = async (tenantId, periodEnd) => {
    const invoices = await Invoice.findAll({
        where: {
            tenantId,
            status: 'paid',
            revenueRecognizedAt: null,
            periodEnd: { [Op.lte]: periodEnd },
        },
    });

    const recognized = [];

    for (const invoice of invoices) {
        await sequelize.transaction(async (transaction) => {
            const amount = toMoney(invoice.amount);
            await postJournalByCodes({
                tenantId,
                entryDate: periodEnd,
                description: `Revenue recognition for invoice #${invoice.id}`,
                referenceType: 'revenue_recognition',
                referenceId: invoice.id,
                lines: [
                    { code: ACCOUNT_CODES.DEFERRED_REVENUE, debit: amount, credit: 0 },
                    { code: ACCOUNT_CODES.SUBSCRIPTION_REVENUE, debit: 0, credit: amount },
                ],
                transaction,
            });

            await invoice.update({ revenueRecognizedAt: new Date() }, { transaction });
            recognized.push(invoice);
        });
    }

    return recognized;
};
