import {
    parseDecimal,
    splitOpeningBalance,
} from './customerBalance.js';

const priceLevelLabels = {
    0: { ar: 'غير محدد', en: 'Unspecified' },
    1: { ar: 'سعر البيع 1', en: 'Sale price 1' },
    2: { ar: 'سعر البيع 2', en: 'Sale price 2' },
    3: { ar: 'سعر البيع 3', en: 'Sale price 3' },
    4: { ar: 'آخر سعر بيع للعميل', en: 'Last customer sale price' },
};

const priceLevelLabel = (level, locale = 'ar') =>
    priceLevelLabels[level]?.[locale] || priceLevelLabels[level]?.ar || '';

const customerBase = (item, locale = 'ar') => ({
    id: item.id,
    customer_code: item.customer_code,
    barcode: item.barcode,
    name: item.name,
    phone: item.phone,
    address: item.address,
    tax_number: item.tax_number,
    material_number: item.material_number,
    commercial_register: item.commercial_register,
    statistical_number: item.statistical_number,
    price_level: Number(item.price_level),
    price_level_label: priceLevelLabel(Number(item.price_level), locale),
    credit_limit: parseDecimal(item.credit_limit),
    late_days_limit: Number(item.late_days_limit),
    opening_balance: parseDecimal(item.opening_balance),
    companyId: item.companyId,
    branchId: item.branchId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
});

const returnObject = {
    customer: (item, locale = 'ar') => {
        const base = customerBase(item, locale);
        const opening = splitOpeningBalance(item.opening_balance);
        return {
            ...base,
            opening_credit: opening.opening_credit,
            opening_debit: opening.opening_debit,
        };
    },

    customerList: (items, locale = 'ar') =>
        items.map((item) => ({
            id: item.id,
            customer_code: item.customer_code,
            name: item.name,
            phone: item.phone,
            barcode: item.barcode,
        })),

    openingBalance: (item) => {
        const opening = splitOpeningBalance(item.opening_balance);
        return {
            id: item.id,
            customer_code: item.customer_code,
            name: item.name,
            opening_credit: opening.opening_credit,
            opening_debit: opening.opening_debit,
        };
    },

    openingBalanceList: (items) => items.map((item) => returnObject.openingBalance(item)),

    receivable: (item, balances) => ({
        id: item.id,
        customer_code: item.customer_code,
        name: item.name,
        remaining_opening_balance: balances.remaining_opening_balance,
        remaining_credit_invoices: balances.remaining_credit_invoices,
        total: balances.total,
    }),

    receivablesReport: (items, totals) => ({
        items,
        totals: {
            remaining_opening_balance: totals.remaining_opening_balance,
            remaining_credit_invoices: totals.remaining_credit_invoices,
            total: totals.total,
        },
        generatedAt: new Date().toISOString(),
    }),

    withBalancesReport: (items, totals) => ({
        items,
        totals: {
            total_remaining: totals.total_remaining,
        },
        generatedAt: new Date().toISOString(),
    }),
};

export default returnObject;
