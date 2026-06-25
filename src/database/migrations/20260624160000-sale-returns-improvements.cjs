'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, DECIMAL, DATE, TEXT } = Sequelize;

        const tableDesc = async (table) => queryInterface.describeTable(table).catch(() => null);

        const shiftsDesc = await tableDesc('tbl_cashier_shifts');
        if (!shiftsDesc) {
            await queryInterface.createTable('tbl_cashier_shifts', {
                id: { type: BIGINT, autoIncrement: true, primaryKey: true },
                branchId: {
                    type: BIGINT,
                    allowNull: false,
                    references: { model: 'tbl_branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                cashierId: {
                    type: BIGINT,
                    allowNull: false,
                    references: { model: 'tbl_cashiers', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                opening_cash: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
                closing_cash: { type: DECIMAL(15, 2), allowNull: true },
                opened_at: { type: DATE, allowNull: false },
                closed_at: { type: DATE, allowNull: true },
                notes: { type: TEXT, allowNull: true },
                createdAt: { type: DATE, allowNull: false },
                updatedAt: { type: DATE, allowNull: false },
            });
        }

        try {
            await queryInterface.addIndex('tbl_sale_returns', ['branchId', 'return_no'], {
                name: 'uniq_sale_returns_branch_return_no',
                unique: true,
            });
        } catch (_) {
            /* ignore if duplicates exist — fix data then re-run manually */
        }

        try {
            await queryInterface.addIndex('tbl_cashier_shifts', ['branchId', 'cashierId', 'closed_at'], {
                name: 'idx_cashier_shifts_active',
            });
        } catch (_) {
            /* ignore */
        }
    },

    async down(queryInterface) {
        try {
            await queryInterface.removeIndex(
                'tbl_sale_returns',
                'uniq_sale_returns_branch_return_no'
            );
        } catch (_) {
            /* ignore */
        }
        try {
            await queryInterface.removeIndex('tbl_cashier_shifts', 'idx_cashier_shifts_active');
        } catch (_) {
            /* ignore */
        }
        await queryInterface.dropTable('tbl_cashier_shifts').catch(() => {});
    },
};
