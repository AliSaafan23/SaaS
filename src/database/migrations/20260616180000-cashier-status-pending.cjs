'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE tbl_cashiers
            MODIFY COLUMN status ENUM('pending', 'block', 'active', 'delete') NOT NULL DEFAULT 'pending'
        `);

        await queryInterface.sequelize.query(`
            UPDATE tbl_cashiers SET status = 'pending' WHERE status = 'block'
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE tbl_cashiers SET status = 'block' WHERE status = 'pending'
        `);

        await queryInterface.sequelize.query(`
            ALTER TABLE tbl_cashiers
            MODIFY COLUMN status ENUM('block', 'active', 'delete') NOT NULL DEFAULT 'block'
        `);
    },
};
