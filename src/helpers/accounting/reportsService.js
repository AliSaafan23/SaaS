import { Op } from 'sequelize';
import {
    JournalLine,
    JournalEntry,
    Account,
    Invoice,
    Payment,
    Customer,
} from '../../models/index.js';
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

/* ---------------------------------------------------------------------------
 * Reports dashboard — KPIs, customer receivables (debtors) and a monthly
 * invoiced-vs-collected trend. All queries are scoped by tenantId so data
 * stays fully isolated between tenants.
 * ------------------------------------------------------------------------- */

const todayStr = () => new Date().toISOString().slice(0, 10);

const monthKey = (value) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Build month buckets either for a custom [from, to] span or the last `count`
// months ending at `endStr`. Span is capped so a huge range stays readable.
const buildMonthBuckets = ({ from, to, count = 6, endStr, locale = 'en-US' }) => {
    let cursor;
    let limit;
    if (from && to) {
        const f = new Date(from);
        const t = new Date(to);
        cursor = new Date(f.getFullYear(), f.getMonth(), 1);
        const last = new Date(t.getFullYear(), t.getMonth(), 1);
        const span = (last.getFullYear() - cursor.getFullYear()) * 12 + (last.getMonth() - cursor.getMonth()) + 1;
        limit = Math.min(Math.max(span, 1), 24);
    } else {
        const end = endStr ? new Date(endStr) : new Date();
        cursor = new Date(end.getFullYear(), end.getMonth() - (count - 1), 1);
        limit = count;
    }
    const buckets = [];
    for (let i = 0; i < limit; i += 1) {
        buckets.push({
            key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
            label: cursor.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
            invoiced: 0,
            collected: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
};

export const getReportsDashboard = async ({
    tenantId,
    locale = 'en-US',
    from = null,
    to = null,
    months = 6,
}) => {
    const toDate = to || todayStr();
    const fromDate = from || null;

    const [invoices, payments, customers, cash, accountsReceivable, deferredRevenue] =
        await Promise.all([
            Invoice.findAll({
                where: { tenantId },
                attributes: [
                    'id',
                    'customerId',
                    'amount',
                    'status',
                    'issueDate',
                    'revenueRecognizedAt',
                ],
                raw: true,
            }),
            Payment.findAll({
                where: { tenantId },
                attributes: ['id', 'invoiceId', 'amount', 'paymentDate'],
                raw: true,
            }),
            Customer.findAll({
                where: { tenantId },
                attributes: ['id', 'name', 'avatar'],
                raw: true,
            }),
            getAccountBalance({ tenantId, accountCode: ACCOUNT_CODES.CASH, asOf: toDate }),
            getAccountBalance({ tenantId, accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, asOf: toDate }),
            getAccountBalance({ tenantId, accountCode: ACCOUNT_CODES.DEFERRED_REVENUE, asOf: toDate }),
        ]);

    const invoiceById = new Map(invoices.map((i) => [i.id, i]));
    const inRange = (d) => d && (!fromDate || d >= fromDate) && d <= toDate;

    // Period sets — driven by the selected date filter (issue / payment date).
    const periodInvoices = invoices.filter((i) => inRange(i.issueDate));
    const periodPayments = payments.filter((p) => inRange(p.paymentDate));

    // Cumulative sets up to `toDate` — used for point-in-time receivables.
    const cumInvoices = invoices.filter((i) => i.issueDate && i.issueDate <= toDate);
    const cumPayments = payments.filter((p) => p.paymentDate && p.paymentDate <= toDate);

    const totalInvoiced = toMoney(periodInvoices.reduce((s, i) => s + Number(i.amount || 0), 0));
    const totalCollected = toMoney(periodPayments.reduce((s, p) => s + Number(p.amount || 0), 0));
    const recognizedRevenue = toMoney(
        periodInvoices
            .filter((i) => i.revenueRecognizedAt)
            .reduce((s, i) => s + Number(i.amount || 0), 0)
    );

    const openInvoicesCount = cumInvoices.filter((i) => i.status === 'open').length;
    const paidInvoicesCount = cumInvoices.filter((i) => i.status === 'paid').length;

    // Per-customer receivables (debtors) — cumulative balance as of `toDate`.
    const customerMap = new Map(
        customers.map((c) => [
            c.id,
            { id: c.id, name: c.name, avatar: c.avatar, invoiced: 0, paid: 0, openCount: 0 },
        ])
    );
    for (const inv of cumInvoices) {
        const row = customerMap.get(inv.customerId);
        if (!row) continue;
        row.invoiced += Number(inv.amount || 0);
        if (inv.status === 'open') row.openCount += 1;
    }
    for (const pay of cumPayments) {
        const inv = invoiceById.get(pay.invoiceId);
        if (!inv) continue;
        const row = customerMap.get(inv.customerId);
        if (!row) continue;
        row.paid += Number(pay.amount || 0);
    }

    const debtors = [...customerMap.values()]
        .map((r) => ({
            id: r.id,
            name: r.name,
            avatar: r.avatar ? `/assets/uploads/customers/${r.avatar}` : null,
            invoiced: toMoney(r.invoiced),
            paid: toMoney(r.paid),
            outstanding: toMoney(r.invoiced - r.paid),
            openCount: r.openCount,
        }))
        .filter((r) => r.outstanding > 0.009)
        .sort((a, b) => b.outstanding - a.outstanding);

    const outstanding = toMoney(debtors.reduce((s, d) => s + d.outstanding, 0));

    // Monthly invoiced-vs-collected trend (custom span or last `months`).
    const buckets = buildMonthBuckets({ from: fromDate, to, count: months, endStr: toDate, locale });
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    for (const inv of invoices) {
        if (!inv.issueDate) continue;
        const k = monthKey(inv.issueDate);
        if (k in idx) buckets[idx[k]].invoiced += Number(inv.amount || 0);
    }
    for (const pay of payments) {
        if (!pay.paymentDate) continue;
        const k = monthKey(pay.paymentDate);
        if (k in idx) buckets[idx[k]].collected += Number(pay.amount || 0);
    }

    return {
        range: { from: fromDate, to: toDate },
        kpis: {
            recognizedRevenue,
            totalInvoiced,
            totalCollected,
            outstanding,
            cash: toMoney(cash),
            accountsReceivable: toMoney(accountsReceivable),
            deferredRevenue: toMoney(deferredRevenue),
            collectionRate: totalInvoiced
                ? Math.round((totalCollected / totalInvoiced) * 100)
                : 0,
            customersCount: customers.length,
            debtorsCount: debtors.length,
            openInvoicesCount,
            paidInvoicesCount,
            invoicesCount: cumInvoices.length,
        },
        debtors,
        trend: {
            labels: buckets.map((b) => b.label),
            invoiced: buckets.map((b) => Math.round(b.invoiced)),
            collected: buckets.map((b) => Math.round(b.collected)),
        },
    };
};

export const getTransactionsLedger = async ({ tenantId, limit = 60, from = null, to = null }) => {
    const toDate = to || todayStr();
    const fromDate = from || null;
    const inRange = (d) => d && (!fromDate || d >= fromDate) && d <= toDate;
    const [invoices, payments] = await Promise.all([
        Invoice.findAll({
            where: { tenantId },
            attributes: ['id', 'amount', 'status', 'issueDate', 'revenueRecognizedAt'],
            include: [{ model: Customer, as: 'customer', attributes: ['name', 'avatar'] }],
            order: [['id', 'DESC']],
        }),
        Payment.findAll({
            where: { tenantId },
            attributes: ['id', 'invoiceId', 'amount', 'paymentDate'],
            include: [
                {
                    model: Invoice,
                    as: 'invoice',
                    attributes: ['id'],
                    include: [{ model: Customer, as: 'customer', attributes: ['name', 'avatar'] }],
                },
            ],
            order: [['id', 'DESC']],
        }),
    ]);

    const avatarUrl = (a) => (a ? `/assets/uploads/customers/${a}` : null);

    const invoiceTx = invoices
        .filter((i) => inRange(i.issueDate))
        .map((i) => ({
        kind: 'invoice',
        id: i.id,
        reference: `INV-${i.id}`,
        customerName: i.customer?.name || null,
        customerAvatar: avatarUrl(i.customer?.avatar),
        amount: toMoney(i.amount),
        direction: 'debit',
        status: i.status,
        date: i.issueDate,
    }));

    const paymentTx = payments
        .filter((p) => inRange(p.paymentDate))
        .map((p) => ({
        kind: 'payment',
        id: p.id,
        reference: `PAY-${p.id}`,
        invoiceId: p.invoiceId,
        customerName: p.invoice?.customer?.name || null,
        customerAvatar: avatarUrl(p.invoice?.customer?.avatar),
        amount: toMoney(p.amount),
        direction: 'credit',
        status: 'paid',
        date: p.paymentDate,
    }));

    const all = [...invoiceTx, ...paymentTx].sort((a, b) => {
        const da = new Date(a.date).getTime() || 0;
        const db = new Date(b.date).getTime() || 0;
        if (db !== da) return db - da;
        return `${b.kind}${b.id}`.localeCompare(`${a.kind}${a.id}`);
    });

    return all.slice(0, limit);
};
