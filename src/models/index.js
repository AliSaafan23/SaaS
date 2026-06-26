import Tenant from './tenant/tenantModel.js';
import TenantUser from './tenant/tenantUserModel.js';
import UserToken from './system/userTokenModel.js';
import Plan from './subscription/planModel.js';
import Customer from './subscription/customerModel.js';
import Subscription from './subscription/subscriptionModel.js';
import Invoice from './billing/invoiceModel.js';
import Payment from './billing/paymentModel.js';
import Account from './accounting/accountModel.js';
import JournalEntry from './accounting/journalEntryModel.js';
import JournalLine from './accounting/journalLineModel.js';
import { sequelize } from '../config/dbConfig.js';

Tenant.hasMany(TenantUser, { foreignKey: 'tenantId', as: 'users' });
TenantUser.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Plan, { foreignKey: 'tenantId', as: 'plans' });
Plan.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Customer, { foreignKey: 'tenantId', as: 'customers' });
Customer.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Subscription, { foreignKey: 'tenantId', as: 'subscriptions' });
Subscription.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Subscription.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });
Customer.hasMany(Subscription, { foreignKey: 'customerId', as: 'subscriptions' });
Plan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });

Tenant.hasMany(Invoice, { foreignKey: 'tenantId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
Subscription.hasMany(Invoice, { foreignKey: 'subscriptionId', as: 'invoices' });

Tenant.hasMany(Payment, { foreignKey: 'tenantId', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' });

Tenant.hasMany(Account, { foreignKey: 'tenantId', as: 'accounts' });
Account.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(JournalEntry, { foreignKey: 'tenantId', as: 'journalEntries' });
JournalEntry.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
JournalEntry.hasMany(JournalLine, { foreignKey: 'journalEntryId', as: 'lines' });
JournalLine.belongsTo(JournalEntry, { foreignKey: 'journalEntryId', as: 'entry' });
JournalLine.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Account.hasMany(JournalLine, { foreignKey: 'accountId', as: 'lines' });

export {
    Tenant,
    TenantUser,
    UserToken,
    Plan,
    Customer,
    Subscription,
    Invoice,
    Payment,
    Account,
    JournalEntry,
    JournalLine,
    sequelize,
};

export default {
    Tenant,
    TenantUser,
    UserToken,
    Plan,
    Customer,
    Subscription,
    Invoice,
    Payment,
    Account,
    JournalEntry,
    JournalLine,
    sequelize,
};
