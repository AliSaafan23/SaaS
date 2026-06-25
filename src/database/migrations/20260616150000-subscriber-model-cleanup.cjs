'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT } = Sequelize;

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

        // Plans: remove legacy limits
        await queryInterface.removeColumn('tbl_subscription_plans', 'maxBranches').catch(() => {});
        await queryInterface.removeColumn('tbl_subscription_plans', 'maxCashiers').catch(() => {});

        // Subscriptions: cashier-only (legacy companyId cleanup)
        const subDesc = await queryInterface.describeTable('tbl_company_subscriptions').catch(() => null);
        if (subDesc?.companyId) {
            await queryInterface.sequelize.query(
                `DELETE FROM tbl_company_subscriptions WHERE cashierId IS NULL`
            );
            await dropFk('tbl_company_subscriptions', 'companyId');
            await queryInterface.removeColumn('tbl_company_subscriptions', 'companyId').catch(() => {});
        }
        if (subDesc?.cashierId) {
            await queryInterface.changeColumn('tbl_company_subscriptions', 'cashierId', {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_cashiers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            }).catch(() => {});
        }

        // Cashiers: no company/branch (legacy columns)
        await dropFk('tbl_cashiers', 'companyId');
        await dropFk('tbl_cashiers', 'branchId');
        await queryInterface.removeColumn('tbl_cashiers', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_cashiers', 'branchId').catch(() => {});
    },

    async down() {
        // Irreversible cleanup — restore manually if needed
    },
};
