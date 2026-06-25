'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, BOOLEAN, INTEGER, ENUM } = Sequelize;

        const tableDesc = async (table) => queryInterface.describeTable(table).catch(() => null);

        const createTableIfNotExists = async (table, definition) => {
            const desc = await tableDesc(table);
            if (!desc) await queryInterface.createTable(table, definition);
        };

        const addColumnIfNotExists = async (table, column, definition) => {
            const desc = await tableDesc(table);
            if (desc && !desc[column]) {
                await queryInterface.addColumn(table, column, definition);
            }
        };

        await createTableIfNotExists('tbl_payment_methods', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            code: { type: STRING(30), allowNull: false, unique: true },
            nameAr: { type: STRING(120), allowNull: false },
            nameEn: { type: STRING(120), allowNull: false },
            affectsCashbox: { type: BOOLEAN, allowNull: false, defaultValue: true },
            requiresCustomer: { type: BOOLEAN, allowNull: false, defaultValue: false },
            isActive: { type: BOOLEAN, allowNull: false, defaultValue: true },
            sortOrder: { type: INTEGER, allowNull: false, defaultValue: 0 },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        const fkPaymentMethod = {
            type: BIGINT,
            allowNull: true,
            references: { model: 'tbl_payment_methods', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        };

        await addColumnIfNotExists('tbl_sales', 'payment_method_id', fkPaymentMethod);
        await addColumnIfNotExists('tbl_sale_payments', 'payment_method_id', fkPaymentMethod);
        await addColumnIfNotExists('tbl_customer_payments', 'payment_method_id', fkPaymentMethod);

        try {
            await queryInterface.addIndex('tbl_sales', ['payment_method_id'], {
                name: 'idx_sales_payment_method_id',
            });
        } catch (err) {
            if (!String(err.message).includes('Duplicate')) throw err;
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tbl_customer_payments', 'payment_method_id').catch(() => {});
        await queryInterface.removeColumn('tbl_sale_payments', 'payment_method_id').catch(() => {});
        await queryInterface.removeColumn('tbl_sales', 'payment_method_id').catch(() => {});
        await queryInterface.dropTable('tbl_payment_methods').catch(() => {});
    },
};
