/**
 * POS Permissions — used in Role.permissions (JSON array of keys)
 * Format: module.action  e.g. sales.view, roles.create
 * Special: "all" grants full access (also admin.isAdmin = true)
 */

const permissions = [
    {
        key: 'dashboard',
        title: { ar: 'لوحة التحكم', en: 'Dashboard' },
        icon: 'tabler-smart-home',
        children: [
            { key: 'dashboard.view', title: { ar: 'عرض الرئيسية', en: 'View Dashboard' }, type: 'page' },
        ],
    },
    {
        key: 'subscriptions',
        title: { ar: 'خطط الاشتراك', en: 'Subscription Plans' },
        icon: 'tabler-credit-card',
        children: [
            { key: 'subscriptions.view', title: { ar: 'عرض الخطط', en: 'View Plans' }, type: 'page' },
            { key: 'subscriptions.create', title: { ar: 'إضافة خطة', en: 'Create Plan' }, type: 'action' },
            { key: 'subscriptions.edit', title: { ar: 'تعديل خطة', en: 'Edit Plan' }, type: 'action' },
            { key: 'subscriptions.delete', title: { ar: 'حذف خطة', en: 'Delete Plan' }, type: 'action' },
        ],
    },
    {
        key: 'subscribers',
        title: { ar: 'المشتركون', en: 'Subscribers' },
        icon: 'tabler-users',
        children: [
            { key: 'subscribers.view', title: { ar: 'عرض المشتركين', en: 'View Subscribers' }, type: 'page' },
            { key: 'subscribers.activate', title: { ar: 'تفعيل الاشتراك', en: 'Activate Subscription' }, type: 'action' },
        ],
    },
    {
        key: 'countries',
        title: { ar: 'الدول', en: 'Countries' },
        icon: 'tabler-world',
        children: [
            { key: 'countries.view', title: { ar: 'عرض الدول', en: 'View Countries' }, type: 'page' },
            { key: 'countries.create', title: { ar: 'إضافة دولة', en: 'Add Country' }, type: 'action' },
            { key: 'countries.edit', title: { ar: 'تعديل دولة', en: 'Edit Country' }, type: 'action' },
            { key: 'countries.delete', title: { ar: 'حذف دولة', en: 'Delete Country' }, type: 'action' },
        ],
    },
    {
        key: 'appInstalls',
        title: { ar: 'تنزيلات التطبيق', en: 'App Installs' },
        icon: 'tabler-device-mobile',
        children: [
            { key: 'appInstalls.view', title: { ar: 'عرض التنزيلات', en: 'View Installs' }, type: 'page' },
        ],
    },
    {
        key: 'support',
        title: { ar: 'الدعم الفني', en: 'Support' },
        icon: 'tabler-headset',
        children: [
            { key: 'support.view', title: { ar: 'عرض التذاكر', en: 'View Tickets' }, type: 'page' },
            { key: 'support.edit', title: { ar: 'إدارة التذاكر', en: 'Manage Tickets' }, type: 'action' },
        ],
    },
    {
        key: 'notifications',
        title: { ar: 'الإشعارات', en: 'Notifications' },
        icon: 'tabler-bell',
        children: [
            { key: 'notifications.view', title: { ar: 'عرض الإشعارات', en: 'View Notifications' }, type: 'page' },
            { key: 'notifications.create', title: { ar: 'إرسال إشعار', en: 'Send Notification' }, type: 'action' },
        ],
    },
    {
        key: 'audit',
        title: { ar: 'سجل التدقيق', en: 'Audit Logs' },
        icon: 'tabler-history',
        children: [
            { key: 'audit.view', title: { ar: 'عرض السجل', en: 'View Audit Log' }, type: 'page' },
        ],
    },
    {
        key: 'settings',
        title: { ar: 'إعدادات النظام', en: 'System Settings' },
        icon: 'tabler-settings',
        children: [
            { key: 'settings.view', title: { ar: 'عرض الإعدادات', en: 'View Settings' }, type: 'page' },
            { key: 'settings.edit', title: { ar: 'تعديل الإعدادات', en: 'Edit Settings' }, type: 'action' },
        ],
    },
    {
        key: 'inventory',
        title: { ar: 'المخزون', en: 'Inventory' },
        icon: 'tabler-building-warehouse',
        children: [
            { key: 'inventory.view', title: { ar: 'عرض المخزون', en: 'View Inventory' }, type: 'page' },
            { key: 'inventory.create', title: { ar: 'إضافة', en: 'Create' }, type: 'action' },
            { key: 'inventory.edit', title: { ar: 'تعديل', en: 'Edit' }, type: 'action' },
            { key: 'inventory.delete', title: { ar: 'حذف', en: 'Delete' }, type: 'action' },
        ],
    },
    {
        key: 'sales',
        title: { ar: 'المبيعات', en: 'Sales' },
        icon: 'tabler-shopping-cart',
        children: [
            { key: 'sales.view', title: { ar: 'عرض المبيعات', en: 'View Sales' }, type: 'page' },
            { key: 'sales.create', title: { ar: 'إنشاء فاتورة', en: 'Create Invoice' }, type: 'action' },
            { key: 'sales.edit', title: { ar: 'تعديل فاتورة', en: 'Edit Invoice' }, type: 'action' },
            { key: 'sales.delete', title: { ar: 'إلغاء فاتورة', en: 'Cancel Invoice' }, type: 'action' },
            { key: 'sales.return', title: { ar: 'مرتجع بيع', en: 'Sale Return' }, type: 'action' },
        ],
    },
    {
        key: 'purchases',
        title: { ar: 'المشتريات', en: 'Purchases' },
        icon: 'tabler-truck-delivery',
        children: [
            { key: 'purchases.view', title: { ar: 'عرض المشتريات', en: 'View Purchases' }, type: 'page' },
            { key: 'purchases.create', title: { ar: 'إنشاء فاتورة شراء', en: 'Create Purchase' }, type: 'action' },
            { key: 'purchases.edit', title: { ar: 'تعديل', en: 'Edit' }, type: 'action' },
            { key: 'purchases.delete', title: { ar: 'إلغاء', en: 'Cancel' }, type: 'action' },
        ],
    },
    {
        key: 'customers',
        title: { ar: 'العملاء', en: 'Customers' },
        icon: 'tabler-users',
        children: [
            { key: 'customers.view', title: { ar: 'عرض العملاء', en: 'View Customers' }, type: 'page' },
            { key: 'customers.create', title: { ar: 'إضافة عميل', en: 'Add Customer' }, type: 'action' },
            { key: 'customers.edit', title: { ar: 'تعديل عميل', en: 'Edit Customer' }, type: 'action' },
            { key: 'customers.delete', title: { ar: 'حذف عميل', en: 'Delete Customer' }, type: 'action' },
            { key: 'customers.payment', title: { ar: 'تحصيل ديون', en: 'Collect Payment' }, type: 'action' },
        ],
    },
    {
        key: 'suppliers',
        title: { ar: 'الموردين', en: 'Suppliers' },
        icon: 'tabler-building-store',
        children: [
            { key: 'suppliers.view', title: { ar: 'عرض الموردين', en: 'View Suppliers' }, type: 'page' },
            { key: 'suppliers.create', title: { ar: 'إضافة مورد', en: 'Add Supplier' }, type: 'action' },
            { key: 'suppliers.edit', title: { ar: 'تعديل مورد', en: 'Edit Supplier' }, type: 'action' },
            { key: 'suppliers.delete', title: { ar: 'حذف مورد', en: 'Delete Supplier' }, type: 'action' },
            { key: 'suppliers.payment', title: { ar: 'سداد مورد', en: 'Pay Supplier' }, type: 'action' },
        ],
    },
    {
        key: 'cashbox',
        title: { ar: 'الصندوق', en: 'Cashbox' },
        icon: 'tabler-cash',
        children: [
            { key: 'cashbox.view', title: { ar: 'عرض الصندوق', en: 'View Cashbox' }, type: 'page' },
            { key: 'cashbox.deposit', title: { ar: 'إيداع', en: 'Deposit' }, type: 'action' },
            { key: 'cashbox.withdraw', title: { ar: 'سحب', en: 'Withdraw' }, type: 'action' },
        ],
    },
    {
        key: 'expenses',
        title: { ar: 'المصروفات', en: 'Expenses' },
        icon: 'tabler-receipt',
        children: [
            { key: 'expenses.view', title: { ar: 'عرض المصروفات', en: 'View Expenses' }, type: 'page' },
            { key: 'expenses.create', title: { ar: 'إضافة مصروف', en: 'Add Expense' }, type: 'action' },
            { key: 'expenses.edit', title: { ar: 'تعديل', en: 'Edit' }, type: 'action' },
            { key: 'expenses.delete', title: { ar: 'حذف', en: 'Delete' }, type: 'action' },
        ],
    },
    {
        key: 'reports',
        title: { ar: 'الاستعلامات', en: 'Reports' },
        icon: 'tabler-chart-bar',
        children: [
            { key: 'reports.view', title: { ar: 'عرض التقارير', en: 'View Reports' }, type: 'page' },
        ],
    },
    {
        key: 'admins',
        title: { ar: 'المشرفين', en: 'Admins' },
        icon: 'tabler-user-shield',
        children: [
            { key: 'admins.view', title: { ar: 'عرض المشرفين', en: 'View Admins' }, type: 'page' },
            { key: 'admins.create', title: { ar: 'إضافة مشرف', en: 'Add Admin' }, type: 'action' },
            { key: 'admins.edit', title: { ar: 'تعديل مشرف', en: 'Edit Admin' }, type: 'action' },
            { key: 'admins.delete', title: { ar: 'حذف مشرف', en: 'Delete Admin' }, type: 'action' },
        ],
    },
    {
        key: 'roles',
        title: { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' },
        icon: 'tabler-lock',
        children: [
            { key: 'roles.view', title: { ar: 'عرض الأدوار', en: 'View Roles' }, type: 'page' },
            { key: 'roles.create', title: { ar: 'إضافة دور', en: 'Add Role' }, type: 'action' },
            { key: 'roles.edit', title: { ar: 'تعديل دور', en: 'Edit Role' }, type: 'action' },
            { key: 'roles.delete', title: { ar: 'حذف دور', en: 'Delete Role' }, type: 'action' },
        ],
    },
];

const getAllPermissionKeys = () => {
    const keys = [];
    permissions.forEach((group) => {
        group.children.forEach((child) => keys.push(child.key));
    });
    return keys;
};

const hasPermissionKey = (key) => getAllPermissionKeys().includes(key) || key === 'all';

/**
 * Check if admin has a specific permission
 * @param {object} admin - Admin instance with role loaded
 * @param {string} permission
 */
const adminHasPermission = (admin, permission) => {
    if (!admin) return false;
    if (admin.isAdmin) return true;

    const perms = admin.role?.permissions || [];
    if (perms.includes('all')) return true;
    if (perms.includes(permission)) return true;

    const [module] = permission.split('.');
    if (perms.includes(`${module}.view`) && permission.endsWith('.view')) return true;

    return false;
};

export default permissions;
export { getAllPermissionKeys, hasPermissionKey, adminHasPermission };
