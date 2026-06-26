import { Op } from "sequelize";
import { sequelize, Subscription, Plan, Invoice } from "../../models/index.js";
import { ACCOUNT_CODES } from "../../config/accountCodes.js";
import { toMoney } from "../../utils/money.js";
import { postJournalByCodes } from "./accountingService.js";

const addMonths = (dateStr, months = 1) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const runMonthlyBilling = async (
  tenantId,
  runDate = new Date().toISOString().slice(0, 10),
) => {
  const subscriptions = await Subscription.findAll({
    where: {
      tenantId,
      status: "active",
      nextBillingDate: { [Op.lte]: runDate },
    },
    include: [{ model: Plan, as: "plan" }],
  });

  const created = [];

  for (const sub of subscriptions) {
    await sequelize.transaction(async (transaction) => {
      const periodStart = sub.nextBillingDate;
      const periodEnd = addMonths(periodStart, 1);
      const amount = toMoney(sub.plan.price);

      const existing = await Invoice.findOne({
        where: {
          tenantId,
          subscriptionId: sub.id,
          periodStart,
          periodEnd,
        },
        transaction,
      });
      if (existing) return;

      const invoice = await Invoice.create(
        {
          tenantId,
          customerId: sub.customerId,
          subscriptionId: sub.id,
          amount,
          status: "open",
          periodStart,
          periodEnd,
          issueDate: runDate,
        },
        { transaction },
      );

      await postJournalByCodes({
        tenantId,
        entryDate: runDate,
        description: `Invoice #${invoice.id} for subscription #${sub.id}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        lines: [
          { code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: amount, credit: 0 },
          { code: ACCOUNT_CODES.DEFERRED_REVENUE, debit: 0, credit: amount },
        ],
        transaction,
      });

      await sub.update({ nextBillingDate: periodEnd }, { transaction });
      created.push(invoice);
    });
  }

  return created;
};
