export const ACCOUNT_CODES = {
    CASH: '1000',
    ACCOUNTS_RECEIVABLE: '1100',
    DEFERRED_REVENUE: '2100',
    SUBSCRIPTION_REVENUE: '4000',
};

export const CHART_OF_ACCOUNTS_TEMPLATE = [
    { code: '1000', name: 'Cash', nameAr: 'النقدية', type: 'asset', normalBalance: 'debit' },
    { code: '1100', name: 'Accounts Receivable', nameAr: 'الذمم المدينة', type: 'asset', normalBalance: 'debit' },
    { code: '2100', name: 'Deferred Revenue', nameAr: 'الإيرادات المؤجلة', type: 'liability', normalBalance: 'credit' },
    { code: '4000', name: 'Subscription Revenue', nameAr: 'إيرادات الاشتراكات', type: 'revenue', normalBalance: 'credit' },
];
