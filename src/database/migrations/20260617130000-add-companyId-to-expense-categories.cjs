'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT } = Sequelize;

        const addColumnIfNotExists = async (table, column, definition) => {
            const desc = await queryInterface.describeTable(table).catch(() => null);
            if (!desc || desc[column]) return;
            await queryInterface.addColumn(table, column, definition);
        };

        await addColumnIfNotExists('tbl_expense_categories', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tbl_expense_categories', 'companyId').catch(() => {});
    },
};
