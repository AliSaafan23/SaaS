'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        const columnExists = async (table, column) => {
            const desc = await queryInterface.describeTable(table).catch(() => null);
            return desc && Object.prototype.hasOwnProperty.call(desc, column);
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

        // Remove cashierId and cashierSubscriptionId from tbl_subscription_payments if they exist
        if (await tableExists('tbl_subscription_payments')) {
            if (await columnExists('tbl_subscription_payments', 'cashierId')) {
                await dropFk('tbl_subscription_payments', 'cashierId');
                await queryInterface.removeColumn('tbl_subscription_payments', 'cashierId').catch(() => {});
            }
            if (await columnExists('tbl_subscription_payments', 'cashierSubscriptionId')) {
                await dropFk('tbl_subscription_payments', 'cashierSubscriptionId');
                await queryInterface.removeColumn('tbl_subscription_payments', 'cashierSubscriptionId').catch(() => {});
            }
        }

        // Drop tbl_cashier_subscriptions if it exists
        if (await tableExists('tbl_cashier_subscriptions')) {
            await queryInterface.dropTable('tbl_cashier_subscriptions').catch(() => {});
        }
    },

    async down() {
        // Irreversible
    },
};
