const parseDateOnly = (str) => {
    if (!str || typeof str !== 'string') return null;
    const d = new Date(`${str}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const parseDateRange = (fromStr, toStr, defaults = { days: 7 }) => {
    const locale = defaults.locale || 'ar-EG';
    let to = parseDateOnly(toStr) || new Date();
    to.setHours(23, 59, 59, 999);

    let from = parseDateOnly(fromStr);
    if (!from) {
        from = new Date(to);
        if (defaults.months) {
            from.setMonth(from.getMonth() - (defaults.months - 1), 1);
        } else {
            from.setDate(from.getDate() - (defaults.days - 1));
        }
        from.setHours(0, 0, 0, 0);
    } else {
        from.setHours(0, 0, 0, 0);
    }

    if (from > to) {
        const swap = from;
        from = new Date(to);
        from.setHours(0, 0, 0, 0);
        to = new Date(swap);
        to.setHours(23, 59, 59, 999);
    }

    if (defaults.maxDays) {
        const maxFrom = new Date(to);
        maxFrom.setDate(maxFrom.getDate() - (defaults.maxDays - 1));
        maxFrom.setHours(0, 0, 0, 0);
        if (from < maxFrom) from = maxFrom;
    }

    if (defaults.maxMonths) {
        const maxFrom = new Date(to.getFullYear(), to.getMonth() - (defaults.maxMonths - 1), 1);
        maxFrom.setHours(0, 0, 0, 0);
        if (from < maxFrom) from = maxFrom;
    }

    return { from, to, locale };
};

export default { parseDateRange };
