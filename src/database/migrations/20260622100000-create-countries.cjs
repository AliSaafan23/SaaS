'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, BOOLEAN, INTEGER, DATE } = Sequelize;

        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        if (!(await tableExists('tbl_countries'))) {
            await queryInterface.createTable('tbl_countries', {
                id: {
                    type: BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                nameAr: {
                    type: STRING(120),
                    allowNull: false,
                },
                nameEn: {
                    type: STRING(120),
                    allowNull: false,
                },
                code: {
                    type: STRING(5),
                    allowNull: false,
                },
                phoneCode: {
                    type: STRING(10),
                    allowNull: true,
                    defaultValue: '',
                },
                isActive: {
                    type: BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
                },
                sortOrder: {
                    type: INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                createdAt: {
                    type: DATE,
                    allowNull: false,
                },
                updatedAt: {
                    type: DATE,
                    allowNull: false,
                },
            });

            await queryInterface.addIndex('tbl_countries', ['code'], {
                unique: true,
                name: 'tbl_countries_code_unique',
            });
            await queryInterface.addIndex('tbl_countries', ['isActive', 'sortOrder'], {
                name: 'tbl_countries_active_sort',
            });
        }

        const [companyCols] = await queryInterface.sequelize.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_companies' AND COLUMN_NAME = 'countryId'`
        );

        if (!companyCols.length) {
            await queryInterface.addColumn('tbl_companies', 'countryId', {
                type: BIGINT,
                allowNull: true,
                references: {
                    model: 'tbl_countries',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            });
            await queryInterface.addIndex('tbl_companies', ['countryId'], {
                name: 'tbl_companies_country_id',
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('tbl_companies', 'tbl_companies_country_id').catch(() => {});
        await queryInterface.removeColumn('tbl_companies', 'countryId').catch(() => {});
        await queryInterface.dropTable('tbl_countries').catch(() => {});
    },
};
