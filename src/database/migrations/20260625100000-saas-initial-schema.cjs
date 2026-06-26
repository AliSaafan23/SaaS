const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('tbl_tenants', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(200), allowNull: false },
        slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
        status: { type: DataTypes.ENUM('active', 'suspended'), defaultValue: 'active' },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_tenant_users', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        name: { type: DataTypes.STRING(150), allowNull: false },
        email: { type: DataTypes.STRING(200), allowNull: false },
        password: { type: DataTypes.STRING(255), allowNull: false },
        status: { type: DataTypes.ENUM('active', 'block', 'delete'), defaultValue: 'active' },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tbl_tenant_users', ['tenantId', 'email'], { unique: true });

    await queryInterface.createTable('tbl_user_tokens', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        userRef: { type: DataTypes.STRING(50), allowNull: false },
        token: { type: DataTypes.TEXT, allowNull: false },
        expired: { type: DataTypes.BOOLEAN, defaultValue: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_plans', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        name: { type: DataTypes.STRING(150), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        billingCycle: { type: DataTypes.ENUM('monthly', 'annual'), defaultValue: 'monthly' },
        currency: { type: DataTypes.STRING(10), defaultValue: 'USD' },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_customers', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        name: { type: DataTypes.STRING(200), allowNull: false },
        email: { type: DataTypes.STRING(200), allowNull: true },
        phone: { type: DataTypes.STRING(50), allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_subscriptions', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_customers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        planId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_plans', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.ENUM('active', 'cancelled', 'paused'), defaultValue: 'active' },
        nextBillingDate: { type: DataTypes.DATEONLY, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_invoices', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_customers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        subscriptionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_subscriptions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        status: { type: DataTypes.ENUM('open', 'paid'), defaultValue: 'open' },
        periodStart: { type: DataTypes.DATEONLY, allowNull: false },
        periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
        issueDate: { type: DataTypes.DATEONLY, allowNull: false },
        revenueRecognizedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_payments', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        invoiceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_invoices', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_accounts', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        code: { type: DataTypes.STRING(20), allowNull: false },
        name: { type: DataTypes.STRING(150), allowNull: false },
        nameAr: { type: DataTypes.STRING(150), allowNull: true },
        type: { type: DataTypes.ENUM('asset', 'liability', 'revenue', 'expense'), allowNull: false },
        normalBalance: { type: DataTypes.ENUM('debit', 'credit'), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tbl_accounts', ['tenantId', 'code'], { unique: true });

    await queryInterface.createTable('tbl_journal_entries', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_tenants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        entryDate: { type: DataTypes.DATEONLY, allowNull: false },
        description: { type: DataTypes.STRING(500), allowNull: false },
        referenceType: { type: DataTypes.STRING(50), allowNull: true },
        referenceId: { type: DataTypes.INTEGER, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable('tbl_journal_lines', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        journalEntryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_journal_entries', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        accountId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tbl_accounts', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },
        debit: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        credit: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
},
down: async (queryInterface) => {
    const q = queryInterface;
    const tables = [
        'tbl_journal_lines',
        'tbl_journal_entries',
        'tbl_accounts',
        'tbl_payments',
        'tbl_invoices',
        'tbl_subscriptions',
        'tbl_customers',
        'tbl_plans',
        'tbl_user_tokens',
        'tbl_tenant_users',
        'tbl_tenants',
    ];
    for (const t of tables) {
        await q.dropTable(t, { cascade: true });
    }
},
};
