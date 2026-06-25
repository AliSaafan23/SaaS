'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const userRefEnum = "ENUM('Admin', 'Cashier', 'Personal', 'Driver', 'Merchant') NOT NULL";

        await queryInterface.sequelize.query(`
            ALTER TABLE tbl_user_tokens
            MODIFY COLUMN userRef ${userRefEnum}
        `);

        await queryInterface.sequelize.query(`
            ALTER TABLE tbl_devices
            MODIFY COLUMN userRef ${userRefEnum} DEFAULT 'Admin'
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            DELETE FROM tbl_user_tokens WHERE userRef = 'Merchant'
        `);
        await queryInterface.sequelize.query(`
            DELETE FROM tbl_devices WHERE userRef = 'Merchant'
        `);

        const userRefEnum = "ENUM('Admin', 'Cashier', 'Personal', 'Driver') NOT NULL";

        await queryInterface.sequelize.query(`
            ALTER TABLE tbl_user_tokens
            MODIFY COLUMN userRef ${userRefEnum}
        `);

        await queryInterface.sequelize.query(`
            ALTER TABLE tbl_devices
            MODIFY COLUMN userRef ${userRefEnum} DEFAULT 'Admin'
        `);
    },
};
