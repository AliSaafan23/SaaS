'use strict';

const { tableExists } = require('../migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        if (!(await tableExists(queryInterface, 'tbl_subscription_payments'))) return;

        const tableDesc = await queryInterface.describeTable('tbl_subscription_payments');

        if (!tableDesc.receiptImage) {
            await queryInterface.addColumn('tbl_subscription_payments', 'receiptImage', {
                type: Sequelize.STRING(255),
                allowNull: true,
                defaultValue: null,
            });
            console.log('  ✅ tbl_subscription_payments.receiptImage added');
        }

        if (!tableDesc.receiptUploadedAt) {
            await queryInterface.addColumn('tbl_subscription_payments', 'receiptUploadedAt', {
                type: Sequelize.DATE,
                allowNull: true,
            });
            console.log('  ✅ tbl_subscription_payments.receiptUploadedAt added');
        }
    },

    async down(queryInterface) {
        if (!(await tableExists(queryInterface, 'tbl_subscription_payments'))) return;
        try {
            await queryInterface.removeColumn('tbl_subscription_payments', 'receiptImage');
        } catch (_) {}
        try {
            await queryInterface.removeColumn('tbl_subscription_payments', 'receiptUploadedAt');
        } catch (_) {}
    },
};
