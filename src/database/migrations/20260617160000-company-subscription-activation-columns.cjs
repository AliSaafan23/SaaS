'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, DATE, STRING } = Sequelize;

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

        if (!(await tableExists('tbl_company_subscriptions'))) return;

        if (!(await columnExists('tbl_company_subscriptions', 'activatedByAdminId'))) {
            await queryInterface.addColumn('tbl_company_subscriptions', 'activatedByAdminId', {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_admins', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            });
        }

        if (!(await columnExists('tbl_company_subscriptions', 'activatedAt'))) {
            await queryInterface.addColumn('tbl_company_subscriptions', 'activatedAt', {
                type: DATE,
                allowNull: true,
            });
        }

        if (!(await columnExists('tbl_company_subscriptions', 'notes'))) {
            await queryInterface.addColumn('tbl_company_subscriptions', 'notes', {
                type: STRING(500),
                allowNull: true,
                defaultValue: '',
            });
        }
    },

    async down(queryInterface) {
        const columnExists = async (table, column) => {
            const desc = await queryInterface.describeTable(table).catch(() => null);
            return desc && Object.prototype.hasOwnProperty.call(desc, column);
        };

        if (await columnExists('tbl_company_subscriptions', 'activatedByAdminId')) {
            await queryInterface.removeColumn('tbl_company_subscriptions', 'activatedByAdminId').catch(() => {});
        }
    },
};
