'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { STRING, ENUM } = Sequelize;

        const addColumnIfNotExists = async (table, column, definition) => {
            const desc = await queryInterface.describeTable(table).catch(() => null);
            if (!desc || desc[column]) return;
            await queryInterface.addColumn(table, column, definition);
        };

        const platformEnum = ENUM('desktop', 'mobile');

        await addColumnIfNotExists('tbl_user_tokens', 'deviceId', {
            type: STRING(100),
            allowNull: true,
        });
        await addColumnIfNotExists('tbl_user_tokens', 'platform', {
            type: platformEnum,
            allowNull: true,
        });

        await addColumnIfNotExists('tbl_devices', 'deviceId', {
            type: STRING(100),
            allowNull: true,
        });
        await addColumnIfNotExists('tbl_devices', 'platform', {
            type: platformEnum,
            allowNull: true,
        });

        await queryInterface.addIndex('tbl_user_tokens', ['userId', 'userRef', 'platform', 'expired']).catch(() => {});
        await queryInterface.addIndex('tbl_devices', ['userId', 'userRef', 'deviceId']).catch(() => {});
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('tbl_user_tokens', 'deviceId').catch(() => {});
        await queryInterface.removeColumn('tbl_user_tokens', 'platform').catch(() => {});
        await queryInterface.removeColumn('tbl_devices', 'deviceId').catch(() => {});
        await queryInterface.removeColumn('tbl_devices', 'platform').catch(() => {});
    },
};
