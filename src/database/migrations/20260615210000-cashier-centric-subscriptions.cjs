'use strict';

const { tableExists } = require('../migrationHelpers.cjs');

/** Legacy: migrate companyId subscriptions → cashierId (skipped on fresh installs). */
module.exports = {
    async up(queryInterface, Sequelize) {
        if (!(await tableExists(queryInterface, 'tbl_company_subscriptions'))) return;

        const desc = await queryInterface.describeTable('tbl_company_subscriptions');
        if (!desc.companyId) return;

        const { BIGINT } = Sequelize;

        if (!desc.cashierId) {
            await queryInterface.addColumn('tbl_company_subscriptions', 'cashierId', {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_cashiers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            });
            console.log('  ✅ tbl_company_subscriptions.cashierId added (legacy)');
        }

        if (desc.companyId?.allowNull === false) {
            const [fks] = await queryInterface.sequelize.query(`
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'tbl_company_subscriptions'
                  AND COLUMN_NAME = 'companyId'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            for (const row of fks) {
                try {
                    await queryInterface.removeConstraint(
                        'tbl_company_subscriptions',
                        row.CONSTRAINT_NAME
                    );
                } catch (_) {}
            }
            await queryInterface.changeColumn('tbl_company_subscriptions', 'companyId', {
                type: BIGINT,
                allowNull: true,
            });
            console.log('  ✅ tbl_company_subscriptions.companyId nullable (legacy)');
        }

        try {
            await queryInterface.removeIndex(
                'tbl_company_subscriptions',
                'idx_company_subscriptions_company_platform'
            );
        } catch (_) {}

        try {
            await queryInterface.addIndex('tbl_company_subscriptions', ['cashierId', 'platform'], {
                name: 'idx_cashier_subscriptions_cashier_platform',
                unique: true,
            });
        } catch (_) {}
    },

    async down(queryInterface) {
        if (!(await tableExists(queryInterface, 'tbl_company_subscriptions'))) return;

        try {
            await queryInterface.removeIndex(
                'tbl_company_subscriptions',
                'idx_cashier_subscriptions_cashier_platform'
            );
        } catch (_) {}

        const desc = await queryInterface.describeTable('tbl_company_subscriptions');
        if (desc.cashierId && desc.companyId) {
            await queryInterface.removeColumn('tbl_company_subscriptions', 'cashierId');
        }
    },
};
