/**
 * Feature keys for subscription gating (API + Flutter).
 * Super Admin can mark keys as free via SystemSetting freeAccessFeatures.
 */

const subscriptionFeatures = [
    { key: 'auth.profile', title: { ar: 'الملف الشخصي', en: 'Profile' }, group: 'auth' },
    { key: 'auth.changePassword', title: { ar: 'تغيير كلمة المرور', en: 'Change Password' }, group: 'auth' },
    { key: 'subscription.viewPlans', title: { ar: 'عرض الخطط', en: 'View Plans' }, group: 'subscription' },
    { key: 'subscription.viewStatus', title: { ar: 'حالة الاشتراك', en: 'Subscription Status' }, group: 'subscription' },
    { key: 'sales.view', title: { ar: 'عرض المبيعات', en: 'View Sales' }, group: 'sales' },
    { key: 'sales.create', title: { ar: 'إنشاء فاتورة', en: 'Create Sale' }, group: 'sales' },
    { key: 'sales.return', title: { ar: 'مرتجع بيع', en: 'Sale Return' }, group: 'sales' },
    { key: 'inventory.view', title: { ar: 'عرض المنتجات', en: 'View Products' }, group: 'inventory' },
    { key: 'inventory.create', title: { ar: 'إضافة منتج', en: 'Create Product' }, group: 'inventory' },
    { key: 'customers.view', title: { ar: 'عرض العملاء', en: 'View Customers' }, group: 'customers' },
    { key: 'customers.create', title: { ar: 'إضافة عميل', en: 'Create Customer' }, group: 'customers' },
    { key: 'suppliers.view', title: { ar: 'عرض الموردين', en: 'View Suppliers' }, group: 'suppliers' },
    { key: 'suppliers.create', title: { ar: 'إضافة مورد', en: 'Create Supplier' }, group: 'suppliers' },
    { key: 'cashbox.view', title: { ar: 'عرض الصندوق', en: 'View Cashbox' }, group: 'cashbox' },
    { key: 'cashbox.deposit', title: { ar: 'إيداع صندوق', en: 'Cashbox Deposit' }, group: 'cashbox' },
    { key: 'cashbox.withdraw', title: { ar: 'سحب صندوق', en: 'Cashbox Withdraw' }, group: 'cashbox' },
    { key: 'expenses.view', title: { ar: 'عرض المصروفات', en: 'View Expenses' }, group: 'expenses' },
    { key: 'expenses.create', title: { ar: 'تسجيل مصروف', en: 'Create Expense' }, group: 'expenses' },
    { key: 'reports.view', title: { ar: 'عرض التقارير', en: 'View Reports' }, group: 'reports' },
    { key: 'reports.daily', title: { ar: 'تقرير يومي', en: 'Daily Report' }, group: 'reports' },
    { key: 'purchases.view', title: { ar: 'عرض المشتريات', en: 'View Purchases' }, group: 'purchases' },
    { key: 'purchases.create', title: { ar: 'إنشاء شراء', en: 'Create Purchase' }, group: 'purchases' },
];

export const DEFAULT_FREE_ACCESS_FEATURES = [
    'auth.profile',
    'auth.changePassword',
    'subscription.viewPlans',
    'subscription.viewStatus',
];

export const FEATURE_GROUP_META = {
    sales: { ar: 'المبيعات', en: 'Sales', icon: 'fa-cash-register' },
    inventory: { ar: 'المخزون', en: 'Inventory', icon: 'fa-boxes' },
    customers: { ar: 'العملاء', en: 'Customers', icon: 'fa-users' },
    suppliers: { ar: 'الموردين', en: 'Suppliers', icon: 'fa-truck-loading' },
    purchases: { ar: 'المشتريات', en: 'Purchases', icon: 'fa-truck' },
    cashbox: { ar: 'الصندوق', en: 'Cashbox', icon: 'fa-wallet' },
    expenses: { ar: 'المصروفات', en: 'Expenses', icon: 'fa-receipt' },
    reports: { ar: 'التقارير', en: 'Reports', icon: 'fa-chart-line' },
};

/** Quick templates for the admin plan form */
export const PLAN_FEATURE_PRESETS = [
    {
        id: 'full',
        title: { ar: 'باقة كاملة', en: 'Full access' },
        hint: { ar: 'كل الميزات المدفوعة', en: 'All paid features' },
        features: 'all',
    },
    {
        id: 'pos',
        title: { ar: 'نقطة بيع', en: 'POS' },
        hint: { ar: 'بيع + منتجات + صندوق', en: 'Sales + inventory + cashbox' },
        features: ['sales.view', 'sales.create', 'inventory.view', 'cashbox.view'],
    },
    {
        id: 'sales_only',
        title: { ar: 'مبيعات فقط', en: 'Sales only' },
        hint: { ar: 'عرض وإنشاء فواتير', en: 'View & create invoices' },
        features: ['sales.view', 'sales.create'],
    },
    {
        id: 'mobile_basic',
        title: { ar: 'موبايل أساسي', en: 'Mobile basic' },
        hint: { ar: 'مناسب لنسخة الموبايل', en: 'Light mobile bundle' },
        features: ['sales.view', 'sales.create', 'inventory.view', 'reports.daily'],
    },
    {
        id: 'offline_pos',
        title: { ar: 'POS أوفلاين', en: 'Offline POS' },
        hint: { ar: 'تشغيل محلي بدون إنترنت — بدون متجر', en: 'Local offline POS — no store' },
        features: [
            'sales.view',
            'sales.create',
            'sales.return',
            'inventory.view',
            'inventory.create',
            'customers.view',
            'customers.create',
            'suppliers.view',
            'suppliers.create',
            'purchases.view',
            'purchases.create',
            'cashbox.view',
            'cashbox.deposit',
            'cashbox.withdraw',
            'expenses.view',
            'expenses.create',
            'reports.view',
            'reports.daily',
        ],
    },
    {
        id: 'enterprise',
        title: { ar: 'متقدم', en: 'Advanced' },
        hint: { ar: 'كل الإدارات', en: 'All departments' },
        features: [
            'sales.view',
            'sales.create',
            'sales.return',
            'inventory.view',
            'inventory.create',
            'customers.view',
            'customers.create',
            'suppliers.view',
            'suppliers.create',
            'purchases.view',
            'purchases.create',
            'cashbox.view',
            'cashbox.deposit',
            'cashbox.withdraw',
            'expenses.view',
            'expenses.create',
            'reports.view',
            'reports.daily',
        ],
    },
];

export const ALL_FEATURE_KEYS = subscriptionFeatures.map((f) => f.key);

export const getPaidFeatureKeys = (freeList = DEFAULT_FREE_ACCESS_FEATURES) =>
    subscriptionFeatures.map((f) => f.key).filter((k) => !freeList.includes(k));

export const getFeaturesByGroup = (freeList = DEFAULT_FREE_ACCESS_FEATURES) => {
    const paid = subscriptionFeatures.filter((f) => !freeList.includes(f.key));
    const groups = {};
    paid.forEach((f) => {
        if (!groups[f.group]) groups[f.group] = [];
        groups[f.group].push(f);
    });
    return groups;
};

export default subscriptionFeatures;
