'use strict';

const { timestamps, createTableIfNotExists, dropTableIfExists } = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, DECIMAL } = Sequelize;
        const ts = timestamps(Sequelize);

        console.log('Adding return item tables...');

        await createTableIfNotExists(queryInterface, 'tbl_sale_return_items', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            sale_return_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_sale_returns', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            sale_item_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_sale_items', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            product_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            qty: { type: DECIMAL(18, 4), allowNull: false },
            price: { type: DECIMAL(15, 2), allowNull: false },
            discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            total: { type: DECIMAL(15, 2), allowNull: false },
            ...ts,
        });

        await createTableIfNotExists(queryInterface, 'tbl_purchase_return_items', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            purchase_return_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_purchase_returns', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            purchase_item_id: {
                type: BIGINT,
                allowNull: true,
                references: { model: 'tbl_purchase_items', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            product_id: {
                type: BIGINT,
                allowNull: false,
                references: { model: 'tbl_products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            qty: { type: DECIMAL(18, 4), allowNull: false },
            cost_price: { type: DECIMAL(15, 2), allowNull: false },
            discount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
            total: { type: DECIMAL(15, 2), allowNull: false },
            ...ts,
        });
    },

    async down(queryInterface) {
        await dropTableIfExists(queryInterface, 'tbl_purchase_return_items');
        await dropTableIfExists(queryInterface, 'tbl_sale_return_items');
    },
};
