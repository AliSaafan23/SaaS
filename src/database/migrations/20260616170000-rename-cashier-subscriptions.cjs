'use strict';

/** Rename legacy tbl_company_subscriptions → tbl_cashier_subscriptions */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT } = Sequelize;

        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        const dropFk = async (table, column) => {
            const [rows] = await queryInterface.sequelize.query(`
                SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = '${table}'
                  AND COLUMN_NAME = '${column}'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            for (const row of rows) {
                await queryInterface.removeConstraint(table, row.CONSTRAINT_NAME).catch(() => {});
            }
        };

        const columnExists = async (table, column) => {
            const desc = await queryInterface.describeTable(table).catch(() => null);
            return desc && Object.prototype.hasOwnProperty.call(desc, column);
        };

        if (
            (await tableExists('tbl_company_subscriptions')) &&
            !(await tableExists('tbl_cashier_subscriptions'))
        ) {
            await queryInterface.renameTable(
                'tbl_company_subscriptions',
                'tbl_cashier_subscriptions'
            );
            console.log('  ✅ Renamed tbl_company_subscriptions → tbl_cashier_subscriptions');
        }

        if (!(await tableExists('tbl_subscription_payments'))) return;

        if (await columnExists('tbl_subscription_payments', 'companySubscriptionId')) {
            await dropFk('tbl_subscription_payments', 'companySubscriptionId');
            await queryInterface.renameColumn(
                'tbl_subscription_payments',
                'companySubscriptionId',
                'cashierSubscriptionId'
            );
        }

        if (await columnExists('tbl_subscription_payments', 'cashierSubscriptionId')) {
            await queryInterface.changeColumn('tbl_subscription_payments', 'cashierSubscriptionId', {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_cashier_subscriptions', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            }).catch(() => {});
        }
    },

    async down(queryInterface) {
        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        if (
            (await tableExists('tbl_cashier_subscriptions')) &&
            !(await tableExists('tbl_company_subscriptions'))
        ) {
            await queryInterface.renameTable(
                'tbl_cashier_subscriptions',
                'tbl_company_subscriptions'
            );
        }

        const desc = await queryInterface.describeTable('tbl_subscription_payments').catch(() => null);
        if (desc?.cashierSubscriptionId) {
            await queryInterface.renameColumn(
                'tbl_subscription_payments',
                'cashierSubscriptionId',
                'companySubscriptionId'
            );
        }
    },
};
