import { Op } from 'sequelize';
import { JournalLine, JournalEntry, Account } from '../../models/index.js';
import { ACCOUNT_CODES } from '../../config/accountCodes.js';
import { getAccountBalance } from './accountingService.js';
import { toMoney } from '../../utils/money.js';

export const getIncomeStatement = async ({ tenantId, from, to }) => {
    const account = await Account.findOne({
        where: { tenantId, code: ACCOUNT_CODES.SUBSCRIPTION_REVENUE },
    });
    if (!account) {
        return { subscriptionRevenue: 0, from, to };
    }

    const lines = await JournalLine.findAll({
        include: [
            {
                model: JournalEntry,
                as: 'entry',
                where: {
                    tenantId,
                    entryDate: { [Op.between]: [from, to] },
                },
                attributes: [],
            },
        ],
        where: { accountId: account.id },
    });

    const credits = toMoney(lines.reduce((s, l) => s + Number(l.credit || 0), 0));
    const debits = toMoney(lines.reduce((s, l) => s + Number(l.debit || 0), 0));

    return {
        from,
        to,
        subscriptionRevenue: toMoney(credits - debits),
    };
};

export const getBalanceSheet = async ({ tenantId, asOf }) => {
    const codes = [
        ACCOUNT_CODES.CASH,
        ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        ACCOUNT_CODES.DEFERRED_REVENUE,
    ];

    const balances = {};
    for (const code of codes) {
        balances[code] = await getAccountBalance({ tenantId, accountCode: code, asOf });
    }

    return {
        asOf,
        cash: balances[ACCOUNT_CODES.CASH],
        accountsReceivable: balances[ACCOUNT_CODES.ACCOUNTS_RECEIVABLE],
        deferredRevenue: balances[ACCOUNT_CODES.DEFERRED_REVENUE],
    };
};
