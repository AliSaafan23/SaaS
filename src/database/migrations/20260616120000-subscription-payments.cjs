'use strict';

const { createTableIfNotExists } = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, ENUM, DATE, DECIMAL } = Sequelize;

        await createTableIfNotExists(queryInterface, 'tbl_subscription_payments', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            cashierId: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_cashiers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            cashierSubscriptionId: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_cashier_subscriptions', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            subscriptionPlanId: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_subscription_plans', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            platform: {
                type: ENUM('desktop', 'mobile'),
                allowNull: false,
            },
            amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            currency: { type: STRING(10), allowNull: false, defaultValue: 'EGP' },
            status: {
                type: ENUM('pending', 'paid', 'failed', 'refunded'),
                allowNull: false,
                defaultValue: 'pending',
            },
            method: {
                type: ENUM('manual', 'paymob'),
                allowNull: false,
                defaultValue: 'manual',
            },
            merchantOrderId: { type: STRING(100), allowNull: true },
            gatewayOrderId: { type: STRING(100), allowNull: true },
            gatewayTransactionId: { type: STRING(100), allowNull: true },
            paidAt: { type: DATE, allowNull: true },
            confirmedByAdminId: { type: BIGINT, allowNull: true },
            notes: { type: STRING(500), allowNull: false, defaultValue: '' },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: {
                type: DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        await queryInterface.addIndex('tbl_subscription_payments', ['cashierId']).catch(() => {});
        await queryInterface.addIndex('tbl_subscription_payments', ['status']).catch(() => {});
        await queryInterface.addIndex('tbl_subscription_payments', ['merchantOrderId']).catch(() => {});
    },

    async down(queryInterface) {
        await queryInterface.dropTable('tbl_subscription_payments');
    },
};
