import { sequelize } from '../config/dbConfig.js';

// Inventory
import Category from './inventory/categoryModel.js';
import Brand from './inventory/brandModel.js';
import Unit from './inventory/unitModel.js';
import Product from './inventory/productModel.js';
import StockMovement from './inventory/stockMovementModel.js';

// Customers
import Customer from './customers/customerModel.js';
import CustomerPayment from './customers/customerPaymentModel.js';

// Suppliers
import Supplier from './suppliers/supplierModel.js';
import SupplierPayment from './suppliers/supplierPaymentModel.js';

// Sales
import Sale from './sales/saleModel.js';
import SaleItem from './sales/saleItemModel.js';
import SalePayment from './sales/salePaymentModel.js';
import SaleReturn from './sales/saleReturnModel.js';
import SaleReturnItem from './sales/saleReturnItemModel.js';

// Purchases
import Purchase from './purchases/purchaseModel.js';
import PurchaseItem from './purchases/purchaseItemModel.js';
import PurchaseReturn from './purchases/purchaseReturnModel.js';
import PurchaseReturnItem from './purchases/purchaseReturnItemModel.js';

// Cashbox
import CashboxTransaction from './cashbox/cashboxTransactionModel.js';
import CashierShift from './cashbox/cashierShiftModel.js';

// Expenses
import ExpenseCategory from './expenses/expenseCategoryModel.js';
import Expense from './expenses/expenseModel.js';

// System / Auth
import Admin from './system/adminModel.js';
import Cashier from './system/cashierModel.js';
import Role from './system/roleModel.js';
import Device from './system/devicesModel.js';
import UserToken from './system/userTokensModel.js';
import Policy from './system/policyModel.js';
import DailyOnlineTime from './system/dailyOnlineTimeModel.js';
import Company from './system/companyModel.js';
import Branch from './system/branchModel.js';
import Merchant from './system/merchantModel.js';

// Platform / Super Admin
import CompanySubscription from './platform/companySubscriptionModel.js';
import SubscriptionPlan from './platform/subscriptionPlanModel.js';
import SubscriptionPayment from './platform/subscriptionPaymentModel.js';
import OfflineLicenseActivation from './platform/offlineLicenseActivationModel.js';
import PaymentMethod from './platform/paymentMethodModel.js';
import Country from './platform/countryModel.js';
import AppInstall from './platform/appInstallModel.js';
import SupportTicket from './platform/supportTicketModel.js';
import AuditLog from './platform/auditLogModel.js';
import SystemSetting from './platform/systemSettingModel.js';
import Notification from './platform/notificationModel.js';

// ============================================================
// SYSTEM / AUTH ASSOCIATIONS
// ============================================================

Role.hasMany(Admin, { foreignKey: 'role_id', as: 'admins', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Admin.belongsTo(Role, { foreignKey: 'role_id', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Admin.hasMany(Device, {
    foreignKey: 'userId',
    constraints: false,
    scope: { userRef: 'Admin' },
    as: 'devices',
});
Device.belongsTo(Admin, {
    foreignKey: 'userId',
    constraints: false,
    as: 'admin',
});

Admin.hasMany(UserToken, {
    foreignKey: 'userId',
    constraints: false,
    scope: { userRef: 'Admin' },
    as: 'tokens',
});
UserToken.belongsTo(Admin, {
    foreignKey: 'userId',
    constraints: false,
    as: 'admin',
});

Admin.hasMany(DailyOnlineTime, {
    foreignKey: 'userId',
    constraints: false,
    scope: { userType: 'admin' },
    as: 'onlineTimes',
});
DailyOnlineTime.belongsTo(Admin, {
    foreignKey: 'userId',
    constraints: false,
    as: 'admin',
});

Cashier.hasMany(Device, {
    foreignKey: 'userId',
    constraints: false,
    scope: { userRef: 'Cashier' },
    as: 'devices',
});
Device.belongsTo(Cashier, {
    foreignKey: 'userId',
    constraints: false,
    as: 'cashier',
});

Cashier.hasMany(UserToken, {
    foreignKey: 'userId',
    constraints: false,
    scope: { userRef: 'Cashier' },
    as: 'tokens',
});
UserToken.belongsTo(Cashier, {
    foreignKey: 'userId',
    constraints: false,
    as: 'cashier',
});

// ============================================================
// MULTI-TENANT ASSOCIATIONS (Company → Branch → Cashier)
// ============================================================

Company.hasMany(Branch, { foreignKey: 'companyId', as: 'branches', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Branch.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Country.hasMany(Company, { foreignKey: 'countryId', as: 'companies', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Company.belongsTo(Country, { foreignKey: 'countryId', as: 'country', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Country.hasMany(AppInstall, { foreignKey: 'countryId', as: 'appInstalls', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
AppInstall.belongsTo(Country, { foreignKey: 'countryId', as: 'country', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Company.hasMany(Merchant, { foreignKey: 'companyId', as: 'merchants', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Merchant.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(Cashier, { foreignKey: 'branchId', as: 'cashiers', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Cashier.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

// ============================================================
// DATA ISOLATION: Company → Master Data
// ============================================================

Company.hasMany(Product, { foreignKey: 'companyId', as: 'products', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Product.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(Category, { foreignKey: 'companyId', as: 'categories', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Category.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(Brand, { foreignKey: 'companyId', as: 'brands', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Brand.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(Unit, { foreignKey: 'companyId', as: 'units', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Unit.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(Customer, { foreignKey: 'companyId', as: 'customers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Customer.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(Supplier, { foreignKey: 'companyId', as: 'suppliers', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Supplier.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(ExpenseCategory, { foreignKey: 'companyId', as: 'expenseCategories', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
ExpenseCategory.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// DATA ISOLATION: Branch → Operational Data
// ============================================================

Branch.hasMany(Sale, { foreignKey: 'branchId', as: 'sales', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Sale.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(Purchase, { foreignKey: 'branchId', as: 'purchases', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Purchase.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(Expense, { foreignKey: 'branchId', as: 'expenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Expense.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(CashboxTransaction, { foreignKey: 'branchId', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(CashierShift, { foreignKey: 'branchId', as: 'cashierShifts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashierShift.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Cashier.hasMany(CashierShift, { foreignKey: 'cashierId', as: 'shifts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashierShift.belongsTo(Cashier, { foreignKey: 'cashierId', as: 'cashier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(StockMovement, { foreignKey: 'branchId', as: 'stockMovements', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
StockMovement.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// PLATFORM ASSOCIATIONS
// ============================================================

// ============================================================
// SUBSCRIPTION (company-centric)
// ============================================================

Company.hasMany(CompanySubscription, { foreignKey: 'companyId', as: 'subscriptions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CompanySubscription.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SubscriptionPlan.hasMany(CompanySubscription, { foreignKey: 'subscriptionPlanId', as: 'companySubscriptions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CompanySubscription.belongsTo(SubscriptionPlan, { foreignKey: 'subscriptionPlanId', as: 'subscriptionPlan', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Company.hasMany(SubscriptionPayment, { foreignKey: 'companyId', as: 'subscriptionPayments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SubscriptionPayment.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

CompanySubscription.hasMany(SubscriptionPayment, { foreignKey: 'companySubscriptionId', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SubscriptionPayment.belongsTo(CompanySubscription, { foreignKey: 'companySubscriptionId', as: 'companySubscription', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

SubscriptionPlan.hasMany(SubscriptionPayment, { foreignKey: 'subscriptionPlanId', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SubscriptionPayment.belongsTo(SubscriptionPlan, { foreignKey: 'subscriptionPlanId', as: 'subscriptionPlan', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Cashier.hasMany(OfflineLicenseActivation, { foreignKey: 'cashierId', as: 'offlineLicenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
OfflineLicenseActivation.belongsTo(Cashier, { foreignKey: 'cashierId', as: 'cashier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Company.hasMany(OfflineLicenseActivation, { foreignKey: 'companyId', as: 'offlineLicenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
OfflineLicenseActivation.belongsTo(Company, { foreignKey: 'companyId', as: 'company', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Branch.hasMany(OfflineLicenseActivation, { foreignKey: 'branchId', as: 'offlineLicenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
OfflineLicenseActivation.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// SUPPORT
// ============================================================

Cashier.hasMany(SupportTicket, { foreignKey: 'cashierId', as: 'tickets', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SupportTicket.belongsTo(Cashier, { foreignKey: 'cashierId', as: 'cashier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// INVENTORY ASSOCIATIONS
// ============================================================

Category.hasMany(Product, { foreignKey: 'category_id', as: 'products', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Unit.hasMany(Product, { foreignKey: 'base_unit_id', as: 'baseUnitProducts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Product.belongsTo(Unit, { foreignKey: 'base_unit_id', as: 'baseUnit', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Unit.hasMany(Product, { foreignKey: 'large_unit_id', as: 'largeUnitProducts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Product.belongsTo(Unit, { foreignKey: 'large_unit_id', as: 'largeUnit', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'saleItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Product.hasMany(PurchaseItem, { foreignKey: 'product_id', as: 'purchaseItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'stockMovements', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Product.hasMany(SaleReturnItem, { foreignKey: 'product_id', as: 'saleReturnItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleReturnItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Product.hasMany(PurchaseReturnItem, { foreignKey: 'product_id', as: 'purchaseReturnItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseReturnItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// CUSTOMER ASSOCIATIONS
// ============================================================

Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Customer.hasMany(CustomerPayment, { foreignKey: 'customer_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CustomerPayment.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Customer.hasMany(SaleReturn, { foreignKey: 'customer_id', as: 'saleReturns', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleReturn.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// SUPPLIER ASSOCIATIONS
// ============================================================

Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', as: 'purchases', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Supplier.hasMany(SupplierPayment, { foreignKey: 'supplier_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SupplierPayment.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Supplier.hasMany(PurchaseReturn, { foreignKey: 'supplier_id', as: 'purchaseReturns', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseReturn.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// SALES ASSOCIATIONS
// ============================================================

Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Sale.hasMany(SalePayment, { foreignKey: 'sale_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SalePayment.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Sale.belongsTo(PaymentMethod, { foreignKey: 'payment_method_id', as: 'paymentMethod', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
PaymentMethod.hasMany(Sale, { foreignKey: 'payment_method_id', as: 'sales', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
SalePayment.belongsTo(PaymentMethod, { foreignKey: 'payment_method_id', as: 'paymentMethod', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
PaymentMethod.hasMany(SalePayment, { foreignKey: 'payment_method_id', as: 'salePayments', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
CustomerPayment.belongsTo(PaymentMethod, { foreignKey: 'payment_method_id', as: 'paymentMethod', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
PaymentMethod.hasMany(CustomerPayment, { foreignKey: 'payment_method_id', as: 'customerPayments', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Sale.hasMany(SaleReturn, { foreignKey: 'sale_id', as: 'returns', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleReturn.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Branch.hasMany(SaleReturn, { foreignKey: 'branchId', as: 'saleReturns', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleReturn.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Cashier.hasMany(SaleReturn, { foreignKey: 'cashierId', as: 'saleReturns', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
SaleReturn.belongsTo(Cashier, { foreignKey: 'cashierId', as: 'cashier', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

SaleReturn.hasMany(SaleReturnItem, { foreignKey: 'sale_return_id', as: 'items', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleReturnItem.belongsTo(SaleReturn, { foreignKey: 'sale_return_id', as: 'saleReturn', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

SaleItem.hasMany(SaleReturnItem, { foreignKey: 'sale_item_id', as: 'returnItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
SaleReturnItem.belongsTo(SaleItem, { foreignKey: 'sale_item_id', as: 'saleItem', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Sale.hasMany(StockMovement, { foreignKey: 'sale_id', as: 'stockMovements', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
StockMovement.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Sale.hasMany(CashboxTransaction, { foreignKey: 'sale_id', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

SaleReturn.hasMany(StockMovement, { foreignKey: 'sale_return_id', as: 'stockMovements', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
StockMovement.belongsTo(SaleReturn, { foreignKey: 'sale_return_id', as: 'saleReturn', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

SaleReturn.hasMany(CashboxTransaction, { foreignKey: 'sale_return_id', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(SaleReturn, { foreignKey: 'sale_return_id', as: 'saleReturn', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// PURCHASES ASSOCIATIONS
// ============================================================

Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Purchase.hasMany(PurchaseReturn, { foreignKey: 'purchase_id', as: 'returns', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseReturn.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

PurchaseReturn.hasMany(PurchaseReturnItem, { foreignKey: 'purchase_return_id', as: 'items', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseReturnItem.belongsTo(PurchaseReturn, { foreignKey: 'purchase_return_id', as: 'purchaseReturn', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

PurchaseItem.hasMany(PurchaseReturnItem, { foreignKey: 'purchase_item_id', as: 'returnItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
PurchaseReturnItem.belongsTo(PurchaseItem, { foreignKey: 'purchase_item_id', as: 'purchaseItem', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Purchase.hasMany(StockMovement, { foreignKey: 'purchase_id', as: 'stockMovements', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
StockMovement.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Purchase.hasMany(CashboxTransaction, { foreignKey: 'purchase_id', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

PurchaseReturn.hasMany(StockMovement, { foreignKey: 'purchase_return_id', as: 'stockMovements', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
StockMovement.belongsTo(PurchaseReturn, { foreignKey: 'purchase_return_id', as: 'purchaseReturn', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// EXPENSES ASSOCIATIONS
// ============================================================

ExpenseCategory.hasMany(Expense, { foreignKey: 'expense_category_id', as: 'expenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'expense_category_id', as: 'category', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Expense.hasMany(CashboxTransaction, { foreignKey: 'expense_id', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

CustomerPayment.hasMany(CashboxTransaction, { foreignKey: 'customer_payment_id', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(CustomerPayment, { foreignKey: 'customer_payment_id', as: 'customerPayment', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

SupplierPayment.hasMany(CashboxTransaction, { foreignKey: 'supplier_payment_id', as: 'cashboxTransactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
CashboxTransaction.belongsTo(SupplierPayment, { foreignKey: 'supplier_payment_id', as: 'supplierPayment', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// ============================================================
// EXPORTS
// ============================================================

export {
    sequelize,
    // System / Auth
    Admin,
    Cashier,
    Role,
    Device,
    UserToken,
    Policy,
    DailyOnlineTime,
    Company,
    Branch,
    Merchant,
    CompanySubscription,
    SubscriptionPlan,
    SubscriptionPayment,
    OfflineLicenseActivation,
    Country,
    PaymentMethod,
    AppInstall,
    SupportTicket,
    AuditLog,
    SystemSetting,
    Notification,
    // Inventory
    Category,
    Brand,
    Unit,
    Product,
    StockMovement,
    // Customers
    Customer,
    CustomerPayment,
    // Suppliers
    Supplier,
    SupplierPayment,
    // Sales
    Sale,
    SaleItem,
    SalePayment,
    SaleReturn,
    SaleReturnItem,
    // Purchases
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    // Cashbox
    CashboxTransaction,
    CashierShift,
    // Expenses
    ExpenseCategory,
    Expense,
};

export default {
    sequelize,
    Admin,
    Cashier,
    Role,
    Device,
    UserToken,
    Policy,
    DailyOnlineTime,
    Company,
    Branch,
    Merchant,
    CompanySubscription,
    SubscriptionPlan,
    SubscriptionPayment,
    OfflineLicenseActivation,
    Country,
    PaymentMethod,
    AppInstall,
    SupportTicket,
    AuditLog,
    SystemSetting,
    Notification,
    Category,
    Brand,
    Unit,
    Product,
    StockMovement,
    Customer,
    CustomerPayment,
    Supplier,
    SupplierPayment,
    Sale,
    SaleItem,
    SalePayment,
    SaleReturn,
    SaleReturnItem,
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    CashboxTransaction,
    CashierShift,
    ExpenseCategory,
    Expense,
};
