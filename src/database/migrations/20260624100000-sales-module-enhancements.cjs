'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, ENUM } = Sequelize;

        const tableDesc = async (table) => queryInterface.describeTable(table).catch(() => null);

        const addColumnIfNotExists = async (table, column, definition) => {
            const desc = await tableDesc(table);
            if (desc && !desc[column]) {
                await queryInterface.addColumn(table, column, definition);
            }
        };

        await addColumnIfNotExists('tbl_sales', 'cashierId', {
            type: BIGINT,
            allowNull: true,
            references: { model: 'tbl_cashiers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        await addColumnIfNotExists('tbl_sales', 'sale_price_type', {
            type: Sequelize.TINYINT,
            allowNull: false,
            defaultValue: 1,
        });

        // Per-branch invoice numbers (drop global unique if present)
        try {
            await queryInterface.removeIndex('tbl_sales', 'invoice_no');
        } catch (_) {
            /* index name may differ */
        }
        try {
            await queryInterface.removeIndex('tbl_sales', ['invoice_no']);
        } catch (_) {
            /* ignore */
        }

        try {
            await queryInterface.addIndex('tbl_sales', ['branchId', 'invoice_no'], {
                unique: true,
                name: 'uniq_sales_branch_invoice_no',
            });
        } catch (err) {
            if (!String(err.message).includes('Duplicate')) throw err;
        }

        try {
            await queryInterface.addIndex('tbl_sales', ['cashierId'], {
                name: 'idx_sales_cashier',
            });
        } catch (err) {
            if (!String(err.message).includes('Duplicate')) throw err;
        }

        // Add cheque to payment enums
        await queryInterface
            .changeColumn('tbl_sales', 'payment_method', {
                type: ENUM('cash', 'card', 'credit', 'cheque', 'mixed'),
                allowNull: false,
            })
            .catch(() => {});

        await queryInterface
            .changeColumn('tbl_sale_payments', 'payment_method', {
                type: ENUM('cash', 'card', 'credit', 'cheque'),
                allowNull: false,
            })
            .catch(() => {});

        await queryInterface
            .changeColumn('tbl_customer_payments', 'payment_method', {
                type: ENUM('cash', 'card', 'credit', 'cheque'),
                allowNull: false,
            })
            .catch(() => {});
    },

    async down(queryInterface, Sequelize) {
        const { BIGINT, ENUM } = Sequelize;

        try {
            await queryInterface.removeIndex('tbl_sales', 'uniq_sales_branch_invoice_no');
        } catch (_) {}

        try {
            await queryInterface.removeIndex('tbl_sales', 'idx_sales_cashier');
        } catch (_) {}

        await queryInterface.removeColumn('tbl_sales', 'cashierId').catch(() => {});

        await queryInterface
            .changeColumn('tbl_sales', 'payment_method', {
                type: ENUM('cash', 'card', 'credit', 'mixed'),
                allowNull: false,
            })
            .catch(() => {});

        await queryInterface
            .changeColumn('tbl_sale_payments', 'payment_method', {
                type: ENUM('cash', 'card', 'credit'),
                allowNull: false,
            })
            .catch(() => {});

        await queryInterface
            .changeColumn('tbl_customer_payments', 'payment_method', {
                type: ENUM('cash', 'card', 'cheque'),
                allowNull: false,
            })
            .catch(() => {});
    },
};
