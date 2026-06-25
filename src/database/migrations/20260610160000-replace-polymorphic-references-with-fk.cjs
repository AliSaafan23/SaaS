'use strict';

const { tableExists } = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT } = Sequelize;

        if (!(await tableExists(queryInterface, 'tbl_stock_movements'))) {
            console.log('  ⏭  stock/cashbox tables missing — skipped');
            return;
        }

        const fk = (model) => ({
            type: BIGINT,
            allowNull: true,
            references: { model, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        const addColumnIfNotExists = async (table, column, definition) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (!tableDesc[column]) {
                await queryInterface.addColumn(table, column, definition);
                console.log(`  ✅ ${table}.${column} added`);
            }
        };

        const removeColumnIfExists = async (table, column) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (tableDesc[column]) {
                await queryInterface.removeColumn(table, column);
                console.log(`  🗑  ${table}.${column} removed`);
            }
        };

        console.log('Replacing polymorphic references with FK columns...');

        await addColumnIfNotExists('tbl_stock_movements', 'sale_id', fk('tbl_sales'));
        await addColumnIfNotExists('tbl_stock_movements', 'purchase_id', fk('tbl_purchases'));
        await addColumnIfNotExists('tbl_stock_movements', 'sale_return_id', fk('tbl_sale_returns'));
        await addColumnIfNotExists('tbl_stock_movements', 'purchase_return_id', fk('tbl_purchase_returns'));

        await addColumnIfNotExists('tbl_cashbox_transactions', 'sale_id', fk('tbl_sales'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'purchase_id', fk('tbl_purchases'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'expense_id', fk('tbl_expenses'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'customer_payment_id', fk('tbl_customer_payments'));
        await addColumnIfNotExists('tbl_cashbox_transactions', 'supplier_payment_id', fk('tbl_supplier_payments'));

        const stockDesc = await queryInterface.describeTable('tbl_stock_movements');
        if (stockDesc.reference_type && stockDesc.reference_id) {
            await queryInterface.sequelize.query(
                "UPDATE tbl_stock_movements SET sale_id = reference_id WHERE reference_type = 'Sale' AND sale_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_stock_movements SET purchase_id = reference_id WHERE reference_type = 'Purchase' AND purchase_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_stock_movements SET sale_return_id = reference_id WHERE reference_type = 'SaleReturn' AND sale_return_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_stock_movements SET purchase_return_id = reference_id WHERE reference_type = 'PurchaseReturn' AND purchase_return_id IS NULL"
            );
            await removeColumnIfExists('tbl_stock_movements', 'reference_type');
            await removeColumnIfExists('tbl_stock_movements', 'reference_id');
        }

        const cashboxDesc = await queryInterface.describeTable('tbl_cashbox_transactions');
        if (cashboxDesc.reference_type && cashboxDesc.reference_id) {
            await queryInterface.sequelize.query(
                "UPDATE tbl_cashbox_transactions SET sale_id = reference_id WHERE reference_type = 'Sale' AND sale_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_cashbox_transactions SET purchase_id = reference_id WHERE reference_type = 'Purchase' AND purchase_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_cashbox_transactions SET expense_id = reference_id WHERE reference_type = 'Expense' AND expense_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_cashbox_transactions SET customer_payment_id = reference_id WHERE reference_type = 'CustomerPayment' AND customer_payment_id IS NULL"
            );
            await queryInterface.sequelize.query(
                "UPDATE tbl_cashbox_transactions SET supplier_payment_id = reference_id WHERE reference_type = 'SupplierPayment' AND supplier_payment_id IS NULL"
            );
            await removeColumnIfExists('tbl_cashbox_transactions', 'reference_type');
            await removeColumnIfExists('tbl_cashbox_transactions', 'reference_id');
        }
    },

    async down(queryInterface, Sequelize) {
        const { BIGINT, STRING } = Sequelize;

        const addColumnIfNotExists = async (table, column, definition) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (!tableDesc[column]) {
                await queryInterface.addColumn(table, column, definition);
            }
        };

        await addColumnIfNotExists('tbl_stock_movements', 'reference_type', { type: STRING(100), allowNull: true });
        await addColumnIfNotExists('tbl_stock_movements', 'reference_id', { type: BIGINT, allowNull: true });
        await addColumnIfNotExists('tbl_cashbox_transactions', 'reference_type', { type: STRING(100), allowNull: true });
        await addColumnIfNotExists('tbl_cashbox_transactions', 'reference_id', { type: BIGINT, allowNull: true });

        await queryInterface.sequelize.query(`
            UPDATE tbl_stock_movements SET reference_type = 'Sale', reference_id = sale_id WHERE sale_id IS NOT NULL;
            UPDATE tbl_stock_movements SET reference_type = 'Purchase', reference_id = purchase_id WHERE purchase_id IS NOT NULL;
            UPDATE tbl_stock_movements SET reference_type = 'SaleReturn', reference_id = sale_return_id WHERE sale_return_id IS NOT NULL;
            UPDATE tbl_stock_movements SET reference_type = 'PurchaseReturn', reference_id = purchase_return_id WHERE purchase_return_id IS NOT NULL;
            UPDATE tbl_cashbox_transactions SET reference_type = 'Sale', reference_id = sale_id WHERE sale_id IS NOT NULL;
            UPDATE tbl_cashbox_transactions SET reference_type = 'Purchase', reference_id = purchase_id WHERE purchase_id IS NOT NULL;
            UPDATE tbl_cashbox_transactions SET reference_type = 'Expense', reference_id = expense_id WHERE expense_id IS NOT NULL;
            UPDATE tbl_cashbox_transactions SET reference_type = 'CustomerPayment', reference_id = customer_payment_id WHERE customer_payment_id IS NOT NULL;
            UPDATE tbl_cashbox_transactions SET reference_type = 'SupplierPayment', reference_id = supplier_payment_id WHERE supplier_payment_id IS NOT NULL;
        `);

        const dropFk = async (table, column) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (tableDesc[column]) {
                await queryInterface.removeColumn(table, column);
            }
        };

        for (const col of ['sale_id', 'purchase_id', 'sale_return_id', 'purchase_return_id']) {
            await dropFk('tbl_stock_movements', col);
        }
        for (const col of ['sale_id', 'purchase_id', 'expense_id', 'customer_payment_id', 'supplier_payment_id']) {
            await dropFk('tbl_cashbox_transactions', col);
        }
    },
};
