export const TENANT_PERMISSIONS = {
    PLANS_READ: 'plans.read',
    PLANS_MANAGE: 'plans.manage',
    CUSTOMERS_READ: 'customers.read',
    CUSTOMERS_MANAGE: 'customers.manage',
    SUBSCRIPTIONS_READ: 'subscriptions.read',
    SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
    BILLING_READ: 'billing.read',
    BILLING_MANAGE: 'billing.manage',
    REPORTS_READ: 'reports.read',
    USERS_MANAGE: 'users.manage',
    ROLES_MANAGE: 'roles.manage',
};

export const ALL_TENANT_PERMISSIONS = Object.values(TENANT_PERMISSIONS);

export const OWNER_PERMISSIONS = ['*'];

export const DEFAULT_ROLE_SLUGS = {
    OWNER: 'owner',
    ADMIN: 'admin',
    ACCOUNTANT: 'accountant',
    VIEWER: 'viewer',
};
