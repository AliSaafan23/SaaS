export const toMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

export const assertBalanced = (lines) => {
    const totalDebit = toMoney(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
    const totalCredit = toMoney(lines.reduce((s, l) => s + Number(l.credit || 0), 0));
    if (totalDebit !== totalCredit) {
        throw new Error(`Journal entry not balanced: debit=${totalDebit} credit=${totalCredit}`);
    }
    if (totalDebit <= 0) {
        throw new Error('Journal entry amount must be greater than zero');
    }
    return totalDebit;
};
