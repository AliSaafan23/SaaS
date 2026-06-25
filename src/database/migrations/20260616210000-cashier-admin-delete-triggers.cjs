'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_after_cashier_delete_cleanup');
        await queryInterface.sequelize.query(`
            CREATE TRIGGER trg_after_cashier_delete_cleanup
            AFTER DELETE ON tbl_cashiers
            FOR EACH ROW
            BEGIN
                DELETE FROM tbl_devices WHERE userId = OLD.id AND userRef = 'Cashier';
                DELETE FROM tbl_user_tokens WHERE userId = OLD.id AND userRef = 'Cashier';
            END
        `);

        await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_after_admin_delete_cleanup');
        await queryInterface.sequelize.query(`
            CREATE TRIGGER trg_after_admin_delete_cleanup
            AFTER DELETE ON tbl_admins
            FOR EACH ROW
            BEGIN
                DELETE FROM tbl_devices WHERE userId = OLD.id AND userRef = 'Admin';
                DELETE FROM tbl_user_tokens WHERE userId = OLD.id AND userRef = 'Admin';
            END
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_after_cashier_delete_cleanup');
        await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_after_admin_delete_cleanup');
    },
};
