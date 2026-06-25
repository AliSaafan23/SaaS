'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const [mobile] = await queryInterface.sequelize.query(
            "SELECT id FROM tbl_subscription_plans WHERE platform = 'mobile' LIMIT 1"
        );
        if (mobile.length) {
            console.log('  ⏭  Mobile plan already exists');
            return;
        }

        await queryInterface.bulkInsert('tbl_subscription_plans', [
            {
                name: JSON.stringify({ ar: 'نسخة الموبايل', en: 'Mobile Cashier' }),
                description: JSON.stringify({ ar: 'برنامج كاشير للموبايل', en: 'Mobile POS cashier' }),
                platform: 'mobile',
                billingCycle: 'monthly',
                price: 1500,
                durationDays: 30,
                maxBranches: 2,
                maxCashiers: 5,
                maxProducts: 2000,
                maxDevices: 3,
                storageLimitMb: 1024,
                features: JSON.stringify(['all']),
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        console.log('  ✅ Desktop & Mobile subscription plans seeded');
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_subscription_plans', {
            platform: ['desktop', 'mobile'],
        });
    },
};
