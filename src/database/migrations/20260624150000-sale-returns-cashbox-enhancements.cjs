'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, ENUM } = Sequelize;

        const tableDesc = async (table) => queryInterface.describeTable(table).catch(() => null);

        const addColumnIfNotExists = async (table, column, definition) => {
            const desc = await tableDesc(table);
            if (desc && !desc[column]) {
                await queryInterface.addColumn(table, column, definition);
            }
        };

        await addColumnIfNotExists('tbl_sale_returns', 'return_no', {
            type: STRING(50),
            allowNull: true,
        });

        await addColumnIfNotExists('tbl_sale_returns', 'branchId', {
            type: BIGINT,
            allowNull: true,
            references: { model: 'tbl_branches', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        await addColumnIfNotExists('tbl_sale_returns', 'cashierId', {
            type: BIGINT,
            allowNull: true,
            references: { model: 'tbl_cashiers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        await addColumnIfNotExists('tbl_cashbox_transactions', 'sale_return_id', {
            type: BIGINT,
            allowNull: true,
            references: { model: 'tbl_sale_returns', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });

        const cashboxDesc = await tableDesc('tbl_cashbox_transactions');
        if (cashboxDesc?.type) {
            await queryInterface.changeColumn('tbl_cashbox_transactions', 'type', {
                type: ENUM(
                    'sale',
                    'purchase',
                    'expense',
                    'customer_payment',
                    'supplier_payment',
                    'deposit',
                    'withdraw',
                    'sale_return'
                ),
                allowNull: false,
            });
        }

        try {
            await queryInterface.addIndex('tbl_sale_returns', ['branchId'], {
                name: 'idx_sale_returns_branchId',
            });
        } catch (_) {
            /* ignore */
        }

        try {
            await queryInterface.addIndex('tbl_cashbox_transactions', ['sale_return_id'], {
                name: 'idx_cashbox_sale_return_id',
            });
        } catch (_) {
            /* ignore */
        }
    },

    async down(queryInterface, Sequelize) {
        const { ENUM } = Sequelize;

        try {
            await queryInterface.removeIndex('tbl_cashbox_transactions', 'idx_cashbox_sale_return_id');
        } catch (_) {
            /* ignore */
        }

        try {
            await queryInterface.removeIndex('tbl_sale_returns', 'idx_sale_returns_branchId');
        } catch (_) {
            /* ignore */
        }

        const cashboxDesc = await queryInterface.describeTable('tbl_cashbox_transactions').catch(() => null);
        if (cashboxDesc?.type) {
            await queryInterface.changeColumn('tbl_cashbox_transactions', 'type', {
                type: ENUM(
                    'sale',
                    'purchase',
                    'expense',
                    'customer_payment',
                    'supplier_payment',
                    'deposit',
                    'withdraw'
                ),
                allowNull: false,
            });
        }

        for (const col of ['sale_return_id']) {
            try {
                await queryInterface.removeColumn('tbl_cashbox_transactions', col);
            } catch (_) {
                /* ignore */
            }
        }

        for (const col of ['return_no', 'branchId', 'cashierId']) {
            try {
                await queryInterface.removeColumn('tbl_sale_returns', col);
            } catch (_) {
                /* ignore */
            }
        }
    },
};
