import { Op } from 'sequelize';
import { Invoice } from '../../models/index.js';

const toDateStr = (d) => {
    const x = new Date(d);
    return x.toISOString().slice(0, 10);
};

const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const bucketKey = (dateStr, groupBy) => {
    const d = new Date(dateStr);
    if (groupBy === 'day') return toDateStr(d);
    if (groupBy === 'year') return String(d.getFullYear());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const buildBuckets = (from, to, groupBy, locale = 'en-US') => {
    const buckets = [];
    const end = startOfDay(to);

    if (groupBy === 'day') {
        const cur = startOfDay(from);
        while (cur <= end) {
            buckets.push({
                key: toDateStr(cur),
                label: cur.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
                total: 0,
            });
            cur.setDate(cur.getDate() + 1);
        }
        return buckets;
    }

    if (groupBy === 'year') {
        for (let y = from.getFullYear(); y <= end.getFullYear(); y += 1) {
            buckets.push({ key: String(y), label: String(y), total: 0 });
        }
        return buckets;
    }

    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        buckets.push({
            key,
            label: cur.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
            total: 0,
        });
        cur.setMonth(cur.getMonth() + 1);
    }
    return buckets;
};

export const resolveRevenueChartRange = (granularity, from, to) => {
    const today = startOfDay(new Date());

    if (granularity === 'custom') {
        return { from: startOfDay(from), to: startOfDay(to) };
    }
    if (granularity === 'daily') {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return { from: start, to: today };
    }
    if (granularity === 'yearly') {
        return { from: new Date(today.getFullYear() - 4, 0, 1), to: today };
    }
    // monthly — last 12 months
    return { from: new Date(today.getFullYear(), today.getMonth() - 11, 1), to: today };
};

export const resolveGroupBy = (granularity, from, to) => {
    if (granularity === 'daily') return 'day';
    if (granularity === 'yearly') return 'year';
    if (granularity === 'monthly') return 'month';
    const days = Math.ceil((to - from) / 86400000) + 1;
    if (days <= 31) return 'day';
    if (days <= 366) return 'month';
    return 'year';
};

export async function getRevenueChartData(tenantId, { granularity = 'monthly', from, to, locale = 'en-US' }) {
    const range = resolveRevenueChartRange(granularity, from, to);
    const groupBy = resolveGroupBy(granularity, range.from, range.to);

    const invoices = await Invoice.findAll({
        where: {
            tenantId,
            status: 'paid',
            issueDate: { [Op.between]: [toDateStr(range.from), toDateStr(range.to)] },
        },
        attributes: ['amount', 'issueDate'],
        raw: true,
    });

    const buckets = buildBuckets(range.from, range.to, groupBy, locale);
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));

    for (const inv of invoices) {
        if (!inv.issueDate) continue;
        const k = bucketKey(inv.issueDate, groupBy);
        if (k in idx) buckets[idx[k]].total += Number(inv.amount || 0);
    }

    const data = buckets.map((b) => Math.round(b.total));
    return {
        labels: buckets.map((b) => b.label),
        data,
        total: data.reduce((s, n) => s + n, 0),
        granularity,
        groupBy,
        from: toDateStr(range.from),
        to: toDateStr(range.to),
    };
}
