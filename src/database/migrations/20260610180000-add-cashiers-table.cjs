'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { BIGINT, STRING, BOOLEAN, ENUM, DATE } = Sequelize;

        await queryInterface.createTable('tbl_cashiers', {
            id: { type: BIGINT, autoIncrement: true, primaryKey: true },
            name: { type: STRING(255), allowNull: false, defaultValue: '' },
            phone: { type: STRING(30), allowNull: false, defaultValue: '' },
            email: { type: STRING(255), allowNull: false, defaultValue: '' },
            password: { type: STRING(255), allowNull: true },
            avatar: { type: STRING(255), allowNull: false, defaultValue: 'default.jpg' },
            language: { type: ENUM('ar', 'en'), allowNull: false, defaultValue: 'ar' },
            status: { type: ENUM('block', 'active', 'delete'), allowNull: false, defaultValue: 'block' },
            active: { type: BOOLEAN, allowNull: false, defaultValue: false },
            emailVerified: { type: BOOLEAN, allowNull: false, defaultValue: false },
            activationCode: { type: STRING(10), allowNull: true },
            activationCodeExpiresAt: { type: DATE, allowNull: true },
            resetCode: { type: STRING(10), allowNull: true },
            resetCodeExpiresAt: { type: DATE, allowNull: true },
            createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.addIndex('tbl_cashiers', ['email'], { unique: true, name: 'tbl_cashiers_email_unique' });
        await queryInterface.addIndex('tbl_cashiers', ['phone'], { name: 'tbl_cashiers_phone' });
        await queryInterface.addIndex('tbl_cashiers', ['status'], { name: 'tbl_cashiers_status' });
        await queryInterface.addIndex('tbl_cashiers', ['active'], { name: 'tbl_cashiers_active' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('tbl_cashiers');
    },
};
