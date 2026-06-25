'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, INTEGER } = Sequelize;

        const addColumnIfNotExists = async (table, column, definition) => {
            const desc = await queryInterface.describeTable(table).catch(() => null);
            if (!desc || desc[column]) return;
            await queryInterface.addColumn(table, column, definition);
        };

        // 1. branchId to tbl_cashiers
        await addColumnIfNotExists('tbl_cashiers', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        // 2. maxBranches to tbl_subscription_plans
        await addColumnIfNotExists('tbl_subscription_plans', 'maxBranches', {
            type: INTEGER,
            allowNull: false,
            defaultValue: 1,
        });

        // 3. branchId to tbl_sales
        await addColumnIfNotExists('tbl_sales', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 4. companyId to tbl_products
        await addColumnIfNotExists('tbl_products', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 5. companyId to tbl_categories
        await addColumnIfNotExists('tbl_categories', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 6. companyId to tbl_brands
        await addColumnIfNotExists('tbl_brands', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 7. companyId to tbl_units
        await addColumnIfNotExists('tbl_units', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 8. companyId to tbl_customers
        await addColumnIfNotExists('tbl_customers', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 9. companyId to tbl_suppliers
        await addColumnIfNotExists('tbl_suppliers', 'companyId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 10. branchId to tbl_purchases
        await addColumnIfNotExists('tbl_purchases', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 11. branchId to tbl_expenses
        await addColumnIfNotExists('tbl_expenses', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 12. branchId to tbl_cashbox_transactions
        await addColumnIfNotExists('tbl_cashbox_transactions', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        // 13. branchId to tbl_stock_movements
        await addColumnIfNotExists('tbl_stock_movements', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tbl_stock_movements', 'branchId').catch(() => {});
        await queryInterface.removeColumn('tbl_cashbox_transactions', 'branchId').catch(() => {});
        await queryInterface.removeColumn('tbl_expenses', 'branchId').catch(() => {});
        await queryInterface.removeColumn('tbl_purchases', 'branchId').catch(() => {});
        await queryInterface.removeColumn('tbl_suppliers', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_customers', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_units', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_brands', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_categories', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_products', 'companyId').catch(() => {});
        await queryInterface.removeColumn('tbl_sales', 'branchId').catch(() => {});
        await queryInterface.removeColumn('tbl_subscription_plans', 'maxBranches').catch(() => {});
        await queryInterface.removeColumn('tbl_cashiers', 'branchId').catch(() => {});
    },
};
