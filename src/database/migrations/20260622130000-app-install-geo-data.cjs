'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        if (!(await tableExists('tbl_app_installs'))) return;

        const [cols] = await queryInterface.sequelize.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_app_installs' AND COLUMN_NAME = 'geoData'`
        );

        if (!cols.length) {
            await queryInterface.addColumn('tbl_app_installs', 'geoData', {
                type: Sequelize.JSON,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tbl_app_installs', 'geoData').catch(() => {});
    },
};
