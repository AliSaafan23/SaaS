import { Op } from "sequelize";
import { Account, JournalEntry, JournalLine } from "../../models/index.js";
import { assertBalanced, toMoney } from "../../utils/money.js";
import { getAccountsMap } from "./seedChartOfAccounts.js";

export const postJournalEntry = async ({
  tenantId,
  entryDate,
  description,
  referenceType,
  referenceId,
  lines,
  transaction,
}) => {
  const normalized = lines.map((line) => ({
    accountId: line.accountId,
    debit: toMoney(line.debit || 0),
    credit: toMoney(line.credit || 0),
  }));

  assertBalanced(normalized);

  const entry = await JournalEntry.create(
    { tenantId, entryDate, description, referenceType, referenceId },
    { transaction },
  );

  await JournalLine.bulkCreate(
    normalized.map((line) => ({ ...line, journalEntryId: entry.id })),
    { transaction },
  );

  return entry;
};

export const postJournalByCodes = async ({
  tenantId,
  entryDate,
  description,
  referenceType,
  referenceId,
  lines,
  transaction,
}) => {
  const accounts = await getAccountsMap(tenantId, transaction);
  const mapped = lines.map((line) => {
    const account = accounts[line.code];
    if (!account) throw new Error(`Account code not found: ${line.code}`);
    return {
      accountId: account.id,
      debit: line.debit || 0,
      credit: line.credit || 0,
    };
  });
  return postJournalEntry({
    tenantId,
    entryDate,
    description,
    referenceType,
    referenceId,
    lines: mapped,
    transaction,
  });
};

export const getAccountBalance = async ({
  tenantId,
  accountCode,
  asOf,
  transaction,
}) => {
  const account = await Account.findOne({
    where: { tenantId, code: accountCode },
    transaction,
  });
  if (!account) return 0;

  const whereEntry = { tenantId };
  if (asOf) {
    whereEntry.entryDate = { [Op.lte]: asOf };
  }

  const lines = await JournalLine.findAll({
    include: [
      { model: JournalEntry, as: "entry", where: whereEntry, attributes: [] },
    ],
    where: { accountId: account.id },
    transaction,
  });

  const debit = toMoney(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const credit = toMoney(lines.reduce((s, l) => s + Number(l.credit || 0), 0));

  if (account.normalBalance === "debit") {
    return toMoney(debit - credit);
  }
  return toMoney(credit - debit);
};
