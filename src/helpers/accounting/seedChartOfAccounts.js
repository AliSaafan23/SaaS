import { CHART_OF_ACCOUNTS_TEMPLATE } from '../../config/accountCodes.js';
import { Account } from '../../models/index.js';

export const seedChartOfAccounts = async (tenantId, transaction) => {
    const rows = CHART_OF_ACCOUNTS_TEMPLATE.map((row) => ({ ...row, tenantId }));
    await Account.bulkCreate(rows, { transaction });
};

export const getAccountsMap = async (tenantId, transaction) => {
    const accounts = await Account.findAll({ where: { tenantId }, transaction });
    const map = {};
    for (const acc of accounts) {
        map[acc.code] = acc;
    }
    return map;
};
