'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, ENUM, DATE } = Sequelize;

        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        if (await tableExists('tbl_app_installs')) return;

        await queryInterface.createTable('tbl_app_installs', {
            id: {
                type: BIGINT,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            deviceId: {
                type: STRING(100),
                allowNull: false,
            },
            deviceType: {
                type: ENUM('ios', 'android', 'web'),
                allowNull: false,
            },
            platform: {
                type: ENUM('desktop', 'mobile'),
                allowNull: false,
                defaultValue: 'mobile',
            },
            countryId: {
                type: BIGINT,
                allowNull: true,
                references: {
                    model: 'tbl_countries',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            ipAddress: {
                type: STRING(45),
                allowNull: true,
                defaultValue: '',
            },
            userAgent: {
                type: STRING(500),
                allowNull: true,
                defaultValue: '',
            },
            appVersion: {
                type: STRING(30),
                allowNull: true,
                defaultValue: '',
            },
            deviceModel: {
                type: STRING(120),
                allowNull: true,
                defaultValue: '',
            },
            osVersion: {
                type: STRING(60),
                allowNull: true,
                defaultValue: '',
            },
            linkedUserId: {
                type: BIGINT,
                allowNull: true,
            },
            linkedUserRef: {
                type: ENUM('Merchant', 'Cashier'),
                allowNull: true,
            },
            installedAt: {
                type: DATE,
                allowNull: false,
            },
            lastSeenAt: {
                type: DATE,
                allowNull: false,
            },
            createdAt: {
                type: DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DATE,
                allowNull: false,
            },
        });

        await queryInterface.addIndex('tbl_app_installs', ['deviceId', 'deviceType'], {
            unique: true,
            name: 'tbl_app_installs_device_unique',
        });
        await queryInterface.addIndex('tbl_app_installs', ['countryId'], {
            name: 'tbl_app_installs_country_id',
        });
        await queryInterface.addIndex('tbl_app_installs', ['platform', 'deviceType'], {
            name: 'tbl_app_installs_platform_type',
        });
        await queryInterface.addIndex('tbl_app_installs', ['installedAt'], {
            name: 'tbl_app_installs_installed_at',
        });
        await queryInterface.addIndex('tbl_app_installs', ['linkedUserId', 'linkedUserRef'], {
            name: 'tbl_app_installs_linked_user',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('tbl_app_installs').catch(() => {});
    },
};
