'use strict';

/** @type {import('sequelize-cli').Migration} */
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

        // Support tickets → cashier instead of company
        if (await tableExists('tbl_support_tickets')) {
            if (await columnExists('tbl_support_tickets', 'companyId')) {
                await dropFk('tbl_support_tickets', 'companyId');
                await queryInterface.removeColumn('tbl_support_tickets', 'companyId').catch(() => {});
            }
            if (!(await columnExists('tbl_support_tickets', 'cashierId'))) {
                await queryInterface.addColumn('tbl_support_tickets', 'cashierId', {
                    type: BIGINT,
                    allowNull: true,
                    references: { model: 'tbl_cashiers', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                });
            }
        }

        // Admins: no company/branch scope
        if (await tableExists('tbl_admins')) {
            await dropFk('tbl_admins', 'companyId');
            await dropFk('tbl_admins', 'branchId');
            await queryInterface.removeColumn('tbl_admins', 'companyId').catch(() => {});
            await queryInterface.removeColumn('tbl_admins', 'branchId').catch(() => {});
        }

        // Drop legacy tables
        if (await tableExists('tbl_branches')) {
            await queryInterface.dropTable('tbl_branches');
        }
        if (await tableExists('tbl_companies')) {
            await queryInterface.dropTable('tbl_companies');
        }
    },

    async down() {
        // Irreversible — restore from backup if needed
    },
};
