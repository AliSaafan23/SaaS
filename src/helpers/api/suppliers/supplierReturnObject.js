import { parseDecimal, splitOpeningBalance } from './supplierBalance.js';

const supplierBase = (item) => ({
    id: item.id,
    supplier_code: item.supplier_code,
    name: item.name,
    phone: item.phone,
    address: item.address,
    tax_number: item.tax_number,
    material_number: item.material_number,
    commercial_register: item.commercial_register,
    statistical_number: item.statistical_number,
    opening_balance: parseDecimal(item.opening_balance),
    companyId: item.companyId,
    branchId: item.branchId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
});

const returnObject = {
    supplier: (item) => {
        const base = supplierBase(item);
        const opening = splitOpeningBalance(item.opening_balance);
        return {
            ...base,
            opening_credit: opening.opening_credit,
            opening_debit: opening.opening_debit,
        };
    },

    supplierList: (items) =>
        items.map((item) => ({
            id: item.id,
            supplier_code: item.supplier_code,
            name: item.name,
            phone: item.phone,
        })),

    openingBalance: (item) => {
        const opening = splitOpeningBalance(item.opening_balance);
        return {
            id: item.id,
            supplier_code: item.supplier_code,
            name: item.name,
            opening_credit: opening.opening_credit,
            opening_debit: opening.opening_debit,
        };
    },

    openingBalanceList: (items) => items.map((item) => returnObject.openingBalance(item)),

    payable: (item, balances) => ({
        id: item.id,
        supplier_code: item.supplier_code,
        name: item.name,
        remaining_opening_balance: balances.remaining_opening_balance,
        remaining_credit_invoices: balances.remaining_credit_invoices,
        total: balances.total,
    }),

    payablesReport: (items, totals) => ({
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
