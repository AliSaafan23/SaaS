'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, TEXT, BOOLEAN, ENUM, DATE, DECIMAL, INTEGER, JSON: JSON_TYPE } = Sequelize;

        await queryInterface.createTable('tbl_subscription_plans', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: JSON_TYPE, allowNull: false },
            description: { type: JSON_TYPE, allowNull: true },
            price: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            durationDays: { type: INTEGER, allowNull: false, defaultValue: 30 },
            maxBranches: { type: INTEGER, allowNull: false, defaultValue: 1 },
            maxCashiers: { type: INTEGER, allowNull: false, defaultValue: 5 },
            maxProducts: { type: INTEGER, allowNull: false, defaultValue: 500 },
            storageLimitMb: { type: INTEGER, allowNull: false, defaultValue: 1024 },
            features: { type: JSON_TYPE, allowNull: true },
            isActive: { type: BOOLEAN, allowNull: false, defaultValue: true },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.createTable('tbl_support_tickets', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            cashierId: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_cashiers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            subject: { type: STRING(255), allowNull: false },
            message: { type: TEXT, allowNull: false },
            status: { type: ENUM('open', 'in_progress', 'resolved', 'closed'), allowNull: false, defaultValue: 'open' },
            priority: { type: ENUM('low', 'medium', 'high', 'urgent'), allowNull: false, defaultValue: 'medium' },
            createdByAdminId: { type: BIGINT, allowNull: true },
            assignedToAdminId: { type: BIGINT, allowNull: true },
            reply: { type: TEXT, allowNull: true },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.createTable('tbl_audit_logs', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            userId: { type: BIGINT, allowNull: true },
            userRef: { type: STRING(50), allowNull: true },
            userName: { type: STRING(255), allowNull: false, defaultValue: '' },
            action: { type: STRING(100), allowNull: false },
            module: { type: STRING(100), allowNull: false },
            ipAddress: { type: STRING(45), allowNull: true },
            metadata: { type: JSON_TYPE, allowNull: true },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.addIndex('tbl_audit_logs', ['module']);
        await queryInterface.addIndex('tbl_audit_logs', ['createdAt']);

        await queryInterface.createTable('tbl_system_settings', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            settingKey: { type: STRING(100), allowNull: false, unique: true },
            settingValue: { type: JSON_TYPE, allowNull: true },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.createTable('tbl_notifications', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            title: { type: STRING(255), allowNull: false },
            message: { type: TEXT, allowNull: false },
            type: { type: ENUM('system', 'subscription', 'promotional'), allowNull: false, defaultValue: 'system' },
            targetType: { type: ENUM('all', 'company', 'branch', 'user'), allowNull: false, defaultValue: 'all' },
            targetId: { type: BIGINT, allowNull: true },
            sentByAdminId: { type: BIGINT, allowNull: true },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

    },

    async down(queryInterface) {
        await queryInterface.dropTable('tbl_notifications');
        await queryInterface.dropTable('tbl_system_settings');
        await queryInterface.dropTable('tbl_audit_logs');
        await queryInterface.dropTable('tbl_support_tickets');
        await queryInterface.dropTable('tbl_subscription_plans');
    },
};
