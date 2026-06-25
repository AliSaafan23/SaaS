'use strict';

const { tableExists } = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, ENUM, DATE, BOOLEAN } = Sequelize;

        const addColumnIfNotExists = async (table, column, definition) => {
            const tableDesc = await queryInterface.describeTable(table);
            if (!tableDesc[column]) {
                await queryInterface.addColumn(table, column, definition);
                console.log(`  ✅ ${table}.${column} added`);
            }
        };

        if (await tableExists(queryInterface, 'tbl_subscription_plans')) {
            await addColumnIfNotExists('tbl_subscription_plans', 'deploymentTier', {
                type: ENUM('offline', 'online'),
                allowNull: false,
                defaultValue: 'online',
            });

            await queryInterface.sequelize.query(
                `UPDATE tbl_subscription_plans SET deploymentTier = 'online' WHERE deploymentTier IS NULL`
            );
        }

        if (!(await tableExists(queryInterface, 'tbl_offline_license_activations'))) {
            await queryInterface.createTable('tbl_offline_license_activations', {
                id: { type: BIGINT, autoIncrement: true, primaryKey: true },
                cashierId: {
                    type: BIGINT,
                    allowNull: false,
                    references: { model: 'tbl_cashiers', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                companyId: {
                    type: BIGINT,
                    allowNull: false,
                    references: { model: 'tbl_companies', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                branchId: {
                    type: BIGINT,
                    allowNull: false,
                    references: { model: 'tbl_branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                deviceId: { type: STRING(100), allowNull: false },
                platform: {
                    type: ENUM('desktop', 'mobile'),
                    allowNull: false,
                },
                deviceType: { type: STRING(32), allowNull: true, defaultValue: '' },
                licenseExpiresAt: { type: DATE, allowNull: true },
                activatedAt: { type: DATE, allowNull: false },
                lastRefreshAt: { type: DATE, allowNull: true },
                revoked: { type: BOOLEAN, allowNull: false, defaultValue: false },
                createdAt: {
                    type: DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                updatedAt: {
                    type: DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
                },
            });

            await queryInterface.addIndex('tbl_offline_license_activations', ['cashierId', 'deviceId'], {
                name: 'idx_offline_license_cashier_device',
                unique: true,
            }).catch(() => {});

            await queryInterface.addIndex('tbl_offline_license_activations', ['companyId', 'platform', 'revoked'], {
                name: 'idx_offline_license_company_platform',
            }).catch(() => {});

            console.log('  ✅ tbl_offline_license_activations created');
        }
    },

    async down(queryInterface) {
        if (await tableExists(queryInterface, 'tbl_offline_license_activations')) {
            await queryInterface.dropTable('tbl_offline_license_activations');
        }
        if (await tableExists(queryInterface, 'tbl_subscription_plans')) {
            try {
                await queryInterface.removeColumn('tbl_subscription_plans', 'deploymentTier');
            } catch (_) {}
        }
    },
};
