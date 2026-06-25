'use strict';

const {
    timestamps,
    createTableIfNotExists,
    dropTableIfExists,
} = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, TEXT, DECIMAL, DATE, DATEONLY, ENUM, JSON, BOOLEAN, INTEGER, TINYINT } = Sequelize;
        const ts = timestamps(Sequelize);

        console.log('Running initial POS schema migration...');

        // ── System ──────────────────────────────────────────────
        await createTableIfNotExists(queryInterface, 'tbl_roles', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: JSON, allowNull: false },
            description: { type: JSON, allowNull: false, defaultValue: { ar: '', en: '' } },
            permissions: { type: JSON, allowNull: false, defaultValue: [] },
            isAdmin: { type: BOOLEAN, allowNull: false, defaultValue: false },
            isDeleted: { type: BOOLEAN, allowNull: false, defaultValue: false },
            isActive: { type: BOOLEAN, allowNull: false, defaultValue: true },
            color: { type: STRING(20), allowNull: false, defaultValue: '#696cff' },
            adminsCount: { type: INTEGER, allowNull: false, defaultValue: 0 },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_admins', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: STRING(255), allowNull: false, defaultValue: '' },
            phone: { type: STRING(30), allowNull: false, defaultValue: '' },
            email: { type: STRING(255), allowNull: false, defaultValue: '' },
            password: { type: STRING(255), allowNull: true },
            avatar: { type: STRING(255), allowNull: false, defaultValue: 'default.jpg' },
            language: { type: ENUM('ar', 'en'), allowNull: false, defaultValue: 'ar' },
            userType: { type: ENUM('admin'), allowNull: false, defaultValue: 'admin' },
            status: { type: ENUM('block', 'active', 'delete'), allowNull: false, defaultValue: 'active' },
            isNotify: { type: BOOLEAN, allowNull: false, defaultValue: true },
            isAdmin: { type: BOOLEAN, allowNull: false, defaultValue: false },
            isHidden: { type: BOOLEAN, allowNull: false, defaultValue: false },
            canEdit: { type: BOOLEAN, allowNull: false, defaultValue: true },
            canDelete: { type: BOOLEAN, allowNull: false, defaultValue: true },
            notifyCount: { type: INTEGER, allowNull: false, defaultValue: 0 },
            active: { type: BOOLEAN, allowNull: false, defaultValue: false },
            role_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_roles', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            theme: { type: ENUM('light', 'dark'), allowNull: false, defaultValue: 'light' },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_devices', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            userId: { type: BIGINT, allowNull: false },
            userRef: { type: ENUM('Admin', 'Cashier', 'Personal', 'Driver'), allowNull: false, defaultValue: 'Admin' },
            fcmToken: { type: STRING(500), allowNull: false, defaultValue: '' },
            deviceType: { type: ENUM('ios', 'android', 'web'), allowNull: false },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_user_tokens', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            userId: { type: BIGINT, allowNull: false },
            userRef: { type: ENUM('Admin', 'Cashier', 'Personal', 'Driver'), allowNull: false },
            token: { type: STRING(500), allowNull: false },
            expired: { type: BOOLEAN, allowNull: false, defaultValue: false },
            expiresAt: { type: DATE, allowNull: true },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_policies', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            type: { type: ENUM('privacy', 'terms', 'about'), allowNull: false, unique: true },
            items: { type: JSON, allowNull: false, defaultValue: [] },
            contactInfo: { type: JSON, allowNull: true },
            socialMedia: { type: JSON, allowNull: true },
            isActive: { type: BOOLEAN, allowNull: false, defaultValue: true },
            version: { type: STRING(20), allowNull: false, defaultValue: '1.0' },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_daily_online_times', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            userId: { type: BIGINT, allowNull: false },
            userType: { type: STRING(50), allowNull: false },
            date: { type: DATEONLY, allowNull: false },
            totalOnlineTime: { type: INTEGER, allowNull: false, defaultValue: 0 },
            ...ts,
        });

        // ── Inventory ───────────────────────────────────────────
        await createTableIfNotExists(queryInterface, 'tbl_categories', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: STRING(150), allowNull: false, unique: true },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_brands', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: STRING(150), allowNull: false, unique: true },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_units', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: STRING(50), allowNull: false, unique: true },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_products', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            barcode: { type: STRING(100), allowNull: false, unique: true },
            name: { type: STRING(255), allowNull: false },
            description: { type: TEXT, allowNull: true },
            image: { type: STRING(500), allowNull: true },
            category_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_categories', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            brand_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_brands', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            cost_price: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            sale_price_1: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            sale_price_2: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            sale_price_3: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            quantity: { type: DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
            reorder_level: { type: DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
            tax_percent: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
            expiry_date: { type: DATEONLY, allowNull: true },
            base_unit_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_units', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            large_unit_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_units', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            units_count: { type: DECIMAL(18, 4), allowNull: false, defaultValue: 1 },
            status: { type: ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_stock_movements', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            product_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            movement_type: {
                type: ENUM('sale', 'purchase', 'sale_return', 'purchase_return', 'inventory', 'manual_add', 'manual_subtract'),
                allowNull: false,
            },
            qty_before: { type: DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
            qty: { type: DECIMAL(18, 4), allowNull: false },
            qty_after: { type: DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
            ...ts,
        });

        // ── Customers & Suppliers ───────────────────────────────
        await createTableIfNotExists(queryInterface, 'tbl_customers', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            customer_code: { type: STRING(50), allowNull: false, unique: true },
            barcode: { type: STRING(100), allowNull: true, unique: true },
            name: { type: STRING(255), allowNull: false },
            phone: { type: STRING(30), allowNull: true },
            address: { type: STRING(500), allowNull: true },
            tax_number: { type: STRING(50), allowNull: true },
            material_number: { type: STRING(50), allowNull: true },
            commercial_register: { type: STRING(50), allowNull: true },
            statistical_number: { type: STRING(50), allowNull: true },
            price_level: { type: TINYINT, allowNull: false, defaultValue: 1 },
            credit_limit: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            late_days_limit: { type: INTEGER, allowNull: false, defaultValue: 0 },
            opening_balance: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_suppliers', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            supplier_code: { type: STRING(50), allowNull: false, unique: true },
            name: { type: STRING(255), allowNull: false },
            phone: { type: STRING(30), allowNull: true },
            address: { type: STRING(500), allowNull: true },
            tax_number: { type: STRING(50), allowNull: true },
            material_number: { type: STRING(50), allowNull: true },
            commercial_register: { type: STRING(50), allowNull: true },
            statistical_number: { type: STRING(50), allowNull: true },
            opening_balance: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            ...ts,
        });

        // ── Sales ───────────────────────────────────────────────
        await createTableIfNotExists(queryInterface, 'tbl_sales', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            invoice_no: { type: STRING(50), allowNull: false, unique: true },
            customer_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_customers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            invoice_date: { type: DATE, allowNull: false },
            subtotal: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            item_discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            invoice_discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            discount_percent: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
            tax_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            total: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            paid_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            due_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            payment_method: { type: ENUM('cash', 'card', 'credit', 'mixed'), allowNull: false },
            sale_price_type: { type: TINYINT, allowNull: false, defaultValue: 1 },
            notes: { type: TEXT, allowNull: true },
            status: { type: ENUM('draft', 'completed', 'cancelled'), allowNull: false, defaultValue: 'completed' },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_sale_items', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            sale_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_sales', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            qty: { type: DECIMAL(18, 4), allowNull: false },
            price: { type: DECIMAL(15, 2), allowNull: false },
            discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            total: { type: DECIMAL(15, 2), allowNull: false },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_sale_payments', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            sale_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_sales', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            payment_method: { type: ENUM('cash', 'card', 'credit'), allowNull: false },
            amount: { type: DECIMAL(15, 2), allowNull: false },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_sale_returns', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            sale_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_sales', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            customer_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_customers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            total: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            notes: { type: TEXT, allowNull: true },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_customer_payments', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            customer_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_customers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            amount: { type: DECIMAL(15, 2), allowNull: false },
            payment_method: { type: ENUM('cash', 'card', 'cheque'), allowNull: false },
            payment_date: { type: DATE, allowNull: false },
            notes: { type: TEXT, allowNull: true },
            ...ts,
        });

        // ── Purchases ───────────────────────────────────────────
        await createTableIfNotExists(queryInterface, 'tbl_purchases', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            invoice_no: { type: STRING(50), allowNull: false, unique: true },
            supplier_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_suppliers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            invoice_date: { type: DATE, allowNull: false },
            subtotal: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            item_discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            invoice_discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            discount_percent: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
            tax_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            total: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            paid_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            due_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            payment_method: { type: ENUM('cash', 'card', 'credit', 'mixed'), allowNull: false },
            notes: { type: TEXT, allowNull: true },
            status: { type: ENUM('draft', 'completed', 'cancelled'), allowNull: false, defaultValue: 'completed' },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_purchase_items', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            purchase_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_purchases', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            qty: { type: DECIMAL(18, 4), allowNull: false },
            cost_price: { type: DECIMAL(15, 2), allowNull: false },
            discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            total: { type: DECIMAL(15, 2), allowNull: false },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_purchase_returns', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            purchase_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_purchases', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            supplier_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_suppliers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            total: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_supplier_payments', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            supplier_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_suppliers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            amount: { type: DECIMAL(15, 2), allowNull: false },
            payment_method: { type: ENUM('cash', 'card', 'cheque'), allowNull: false },
            payment_date: { type: DATE, allowNull: false },
            notes: { type: TEXT, allowNull: true },
            ...ts,
        });

        // ── Cashbox & Expenses ──────────────────────────────────
        await createTableIfNotExists(queryInterface, 'tbl_cashbox_transactions', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            type: {
                type: ENUM('sale', 'purchase', 'expense', 'customer_payment', 'supplier_payment', 'deposit', 'withdraw'),
                allowNull: false,
            },
            amount: { type: DECIMAL(15, 2), allowNull: false },
            description: { type: TEXT, allowNull: true },
            transaction_date: { type: DATE, allowNull: false },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_expense_categories', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: STRING(150), allowNull: false, unique: true },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_expenses', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            expense_category_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_expense_categories', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            amount: { type: DECIMAL(15, 2), allowNull: false },
            payment_method: { type: ENUM('cash', 'card', 'cheque'), allowNull: false },
            expense_date: { type: DATE, allowNull: false },
            description: { type: TEXT, allowNull: true },
            ...ts,
        });

        const fk = (model) => ({
            type: BIGINT,
            allowNull: true,
            references: { model, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        const addColumnIfNotExists = async (table, column, definition) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (!tableDesc[column]) {
                await queryInterface.addColumn(table, column, definition);
                console.log(`  ✅ ${table}.${column} added`);
            }
        };

        await addColumnIfNotExists('tbl_stock_movements', 'sale_id', fk('tbl_sales'));
        await addColumnIfNotExists('tbl_stock_movements', 'purchase_id', fk('tbl_purchases'));
        await addColumnIfNotExists('tbl_stock_movements', 'sale_return_id', fk('tbl_sale_returns'));
        await addColumnIfNotExists('tbl_stock_movements', 'purchase_return_id', fk('tbl_purchase_returns'));

        await addColumnIfNotExists('tbl_cashbox_transactions', 'sale_id', fk('tbl_sales'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'purchase_id', fk('tbl_purchases'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'expense_id', fk('tbl_expenses'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'customer_payment_id', fk('tbl_customer_payments'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'supplier_payment_id', fk('tbl_supplier_payments'));

        console.log('Initial POS schema migration completed.');
    },

    async down(queryInterface) {
        console.log('Reverting initial POS schema migration...');

        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'tbl_expenses',
            'tbl_expense_categories',
            'tbl_cashbox_transactions',
            'tbl_supplier_payments',
            'tbl_purchase_returns',
            'tbl_purchase_items',
            'tbl_purchases',
            'tbl_customer_payments',
            'tbl_sale_returns',
            'tbl_sale_payments',
            'tbl_sale_items',
            'tbl_sales',
            'tbl_stock_movements',
            'tbl_products',
            'tbl_units',
            'tbl_brands',
            'tbl_categories',
            'tbl_suppliers',
            'tbl_customers',
            'tbl_daily_online_times',
            'tbl_policies',
            'tbl_user_tokens',
            'tbl_devices',
            'tbl_admins',
            'tbl_roles',
        ];

        for (const table of tables) {
            await dropTableIfExists(queryInterface, table);
        }

        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Initial POS schema migration reverted.');
    },
};
