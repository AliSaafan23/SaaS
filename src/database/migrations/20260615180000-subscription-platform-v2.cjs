'use strict';

const { createTableIfNotExists, tableExists } = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, ENUM, DATE, BOOLEAN } = Sequelize;

        const addColumnIfNotExists = async (table, column, definition) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (!tableDesc[column]) {
                await queryInterface.addColumn(table, column, definition);
                console.log(`  ✅ ${table}.${column} added`);
            }
        };

        if (await tableExists(queryInterface, 'tbl_subscription_plans')) {
            await addColumnIfNotExists('tbl_subscription_plans', 'platform', {
                type: ENUM('desktop', 'mobile'),
                allowNull: false,
                defaultValue: 'desktop',
            });
            await addColumnIfNotExists('tbl_subscription_plans', 'billingCycle', {
                type: ENUM('monthly', 'annual', 'lifetime'),
                allowNull: false,
                defaultValue: 'monthly',
            });
            await addColumnIfNotExists('tbl_subscription_plans', 'maxDevices', {
                type: BIGINT,
                allowNull: false,
                defaultValue: 1,
            });
        }

        await createTableIfNotExists(queryInterface, 'tbl_cashier_subscriptions', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            cashierId: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_cashiers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
            status: {
                type: ENUM('pending', 'active', 'expired', 'suspended'),
                allowNull: false,
                defaultValue: 'pending',
            },
            startsAt: { type: DATE, allowNull: true },
            expiresAt: { type: DATE, allowNull: true },
            activatedByAdminId: { type: BIGINT, allowNull: true },
            activatedAt: { type: DATE, allowNull: true },
            notes: { type: STRING(500), allowNull: true, defaultValue: '' },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: {
                type: DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        if (await tableExists(queryInterface, 'tbl_cashier_subscriptions')) {
            await queryInterface.addIndex('tbl_cashier_subscriptions', ['cashierId', 'platform'], {
                name: 'idx_cashier_subscriptions_cashier_platform',
                unique: true,
            }).catch(() => {});
            await queryInterface.addIndex('tbl_cashier_subscriptions', ['status']).catch(() => {});
        }
    },

    async down(queryInterface) {
        if (await tableExists(queryInterface, 'tbl_cashier_subscriptions')) {
            await queryInterface.dropTable('tbl_cashier_subscriptions');
        }
        const cols = ['platform', 'billingCycle', 'maxDevices'];
        for (const col of cols) {
            try {
                await queryInterface.removeColumn('tbl_subscription_plans', col);
            } catch (_) {}
        }
    },
};
