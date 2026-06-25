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

        const branchIdColumn = {
            type: BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        };

        const catalogTables = [
            'tbl_products',
            'tbl_customers',
            'tbl_suppliers',
            'tbl_categories',
            'tbl_brands',
            'tbl_units',
        ];

        for (const table of catalogTables) {
            await addColumnIfNotExists(table, 'branchId', branchIdColumn);
        }

        // Backfill branchId from first active branch per company
        for (const table of catalogTables) {
            await queryInterface.sequelize.query(`
                UPDATE \`${table}\` AS t
                INNER JOIN (
                    SELECT companyId, MIN(id) AS branchId
                    FROM tbl_branches
                    WHERE status = 'active' AND companyId IS NOT NULL
                    GROUP BY companyId
                ) AS b ON t.companyId = b.companyId
                SET t.branchId = b.branchId
                WHERE t.branchId IS NULL AND t.companyId IS NOT NULL
            `);
        }

        const removeUniqueOnFields = async (table, fields) => {
            const indexes = await queryInterface.showIndex(table).catch(() => []);
            for (const idx of indexes) {
                if (!idx.unique) continue;
                const attrs = (idx.fields || []).map((f) => f.attribute || f.name);
                const matches =
                    attrs.length === fields.length &&
                    fields.every((field, i) => attrs[i] === field);
                if (matches) {
                    await queryInterface.removeIndex(table, idx.name).catch(() => {});
                }
            }
        };

        // Product barcode: global unique -> per branch
        await removeUniqueOnFields('tbl_products', ['barcode']);
        await queryInterface.addIndex('tbl_products', ['companyId', 'branchId', 'barcode'], {
            unique: true,
            name: 'tbl_products_company_branch_barcode_unique',
        }).catch(() => {});
        await queryInterface.addIndex('tbl_products', ['branchId'], {
            name: 'tbl_products_branchId',
        }).catch(() => {});

        // Customer codes per branch
        await removeUniqueOnFields('tbl_customers', ['customer_code']);
        await removeUniqueOnFields('tbl_customers', ['barcode']);
        await queryInterface.addIndex('tbl_customers', ['companyId', 'branchId', 'customer_code'], {
            unique: true,
            name: 'tbl_customers_company_branch_code_unique',
        }).catch(() => {});
        await queryInterface.addIndex('tbl_customers', ['companyId', 'branchId', 'barcode'], {
            unique: true,
            name: 'tbl_customers_company_branch_barcode_unique',
        }).catch(() => {});
        await queryInterface.addIndex('tbl_customers', ['branchId'], {
            name: 'tbl_customers_branchId',
        }).catch(() => {});

        // Supplier codes per branch
        await removeUniqueOnFields('tbl_suppliers', ['supplier_code']);
        await queryInterface.addIndex('tbl_suppliers', ['companyId', 'branchId', 'supplier_code'], {
            unique: true,
            name: 'tbl_suppliers_company_branch_code_unique',
        }).catch(() => {});
        await queryInterface.addIndex('tbl_suppliers', ['branchId'], {
            name: 'tbl_suppliers_branchId',
        }).catch(() => {});

        for (const table of ['tbl_categories', 'tbl_brands', 'tbl_units']) {
            await queryInterface.addIndex(table, ['branchId'], {
                name: `${table}_branchId`,
            }).catch(() => {});
            await queryInterface.addIndex(table, ['companyId', 'branchId', 'name'], {
                unique: true,
                name: `${table}_company_branch_name_unique`,
            }).catch(() => {});
        }
    },

    async down(queryInterface) {
        const dropIndex = (table, name) =>
            queryInterface.removeIndex(table, name).catch(() => {});

        await dropIndex('tbl_units', 'tbl_units_company_branch_name_unique');
        await dropIndex('tbl_units', 'tbl_units_branchId');
        await dropIndex('tbl_brands', 'tbl_brands_company_branch_name_unique');
        await dropIndex('tbl_brands', 'tbl_brands_branchId');
        await dropIndex('tbl_categories', 'tbl_categories_company_branch_name_unique');
        await dropIndex('tbl_categories', 'tbl_categories_branchId');
        await dropIndex('tbl_suppliers', 'tbl_suppliers_branchId');
        await dropIndex('tbl_suppliers', 'tbl_suppliers_company_branch_code_unique');
        await dropIndex('tbl_customers', 'tbl_customers_branchId');
        await dropIndex('tbl_customers', 'tbl_customers_company_branch_barcode_unique');
        await dropIndex('tbl_customers', 'tbl_customers_company_branch_code_unique');
        await dropIndex('tbl_products', 'tbl_products_branchId');
        await dropIndex('tbl_products', 'tbl_products_company_branch_barcode_unique');

        for (const table of [
            'tbl_products',
            'tbl_customers',
            'tbl_suppliers',
            'tbl_categories',
            'tbl_brands',
            'tbl_units',
        ]) {
            await queryInterface.removeColumn(table, 'branchId').catch(() => {});
        }
    },
};
