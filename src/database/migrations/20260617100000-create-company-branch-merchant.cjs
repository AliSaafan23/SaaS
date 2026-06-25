'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, ENUM, BOOLEAN, DATE } = Sequelize;

        const tableExists = async (table) => {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT 1 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
                { replacements: { table } }
            );
            return rows.length > 0;
        };

        // Create tbl_companies
        if (!(await tableExists('tbl_companies'))) {
            await queryInterface.createTable('tbl_companies', {
                id: {
                    type: BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                name: {
                    type: STRING(255),
                    allowNull: false,
                },
                phone: {
                    type: STRING(30),
                    allowNull: true,
                },
                address: {
                    type: STRING(500),
                    allowNull: true,
                },
                logo: {
                    type: STRING(255),
                    allowNull: true,
                },
                status: {
                    type: ENUM('pending', 'active', 'suspended'),
                    defaultValue: 'pending',
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
        }

        // Create tbl_branches
        if (!(await tableExists('tbl_branches'))) {
            await queryInterface.createTable('tbl_branches', {
                id: {
                    type: BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                companyId: {
                    type: BIGINT,
                    allowNull: false,
                    references: {
                        model: 'tbl_companies',
                        key: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                name: {
                    type: STRING(255),
                    allowNull: false,
                },
                address: {
                    type: STRING(500),
                    allowNull: true,
                },
                phone: {
                    type: STRING(30),
                    allowNull: true,
                },
                status: {
                    type: ENUM('active', 'inactive'),
                    defaultValue: 'active',
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
        }

        // Create tbl_merchants
        if (!(await tableExists('tbl_merchants'))) {
            await queryInterface.createTable('tbl_merchants', {
                id: {
                    type: BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                companyId: {
                    type: BIGINT,
                    allowNull: false,
                    references: {
                        model: 'tbl_companies',
                        key: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                name: {
                    type: STRING(255),
                    allowNull: false,
                },
                email: {
                    type: STRING(255),
                    allowNull: false,
                    unique: true,
                },
                password: {
                    type: STRING(255),
                    allowNull: false,
                },
                phone: {
                    type: STRING(30),
                    allowNull: true,
                },
                avatar: {
                    type: STRING(255),
                    allowNull: true,
                },
                language: {
                    type: ENUM('ar', 'en'),
                    defaultValue: 'ar',
                },
                status: {
                    type: ENUM('pending', 'active', 'block', 'delete'),
                    defaultValue: 'pending',
                },
                active: {
                    type: BOOLEAN,
                    defaultValue: false,
                },
                activationCode: {
                    type: STRING(10),
                    allowNull: true,
                },
                activationCodeExpiresAt: {
                    type: DATE,
                    allowNull: true,
                },
                resetCode: {
                    type: STRING(10),
                    allowNull: true,
                },
                resetCodeExpiresAt: {
                    type: DATE,
                    allowNull: true,
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
        }

        // Create tbl_company_subscriptions
        if (!(await tableExists('tbl_company_subscriptions'))) {
            await queryInterface.createTable('tbl_company_subscriptions', {
                id: {
                    type: BIGINT,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                companyId: {
                    type: BIGINT,
                    allowNull: false,
                    references: {
                        model: 'tbl_companies',
                        key: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                subscriptionPlanId: {
                    type: BIGINT,
                    allowNull: false,
                    references: {
                        model: 'tbl_subscription_plans',
                        key: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                platform: {
                    type: ENUM('desktop', 'mobile'),
                    allowNull: false,
                },
                status: {
                    type: ENUM('pending', 'active', 'expired', 'suspended'),
                    defaultValue: 'pending',
                },
                startsAt: {
                    type: DATE,
                    allowNull: true,
                },
                expiresAt: {
                    type: DATE,
                    allowNull: true,
                },
                activatedAt: {
                    type: DATE,
                    allowNull: true,
                },
                notes: {
                    type: STRING(500),
                    allowNull: true,
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
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('tbl_company_subscriptions').catch(() => {});
        await queryInterface.dropTable('tbl_merchants').catch(() => {});
        await queryInterface.dropTable('tbl_branches').catch(() => {});
        await queryInterface.dropTable('tbl_companies').catch(() => {});
    },
};
