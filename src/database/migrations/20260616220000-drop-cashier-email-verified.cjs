'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE tbl_cashiers
            SET active = TRUE
            WHERE emailVerified = TRUE AND active = FALSE
        `);

        await queryInterface.removeColumn('tbl_cashiers', 'emailVerified');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('tbl_cashiers', 'emailVerified', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        await queryInterface.sequelize.query(`
            UPDATE tbl_cashiers SET emailVerified = active
        `);
    },
};
