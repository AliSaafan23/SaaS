'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const [existing] = await queryInterface.sequelize.query(
            'SELECT id FROM tbl_subscription_plans LIMIT 1'
        );
        if (existing.length) return;

        await queryInterface.bulkInsert('tbl_subscription_plans', [
            {
                name: JSON.stringify({ ar: 'أساسي', en: 'Basic' }),
                description: JSON.stringify({ ar: 'للمحلات الصغيرة', en: 'For small stores' }),
                price: 99,
                durationDays: 30,
                maxBranches: 1,
                maxCashiers: 3,
                maxProducts: 200,
                storageLimitMb: 512,
                features: JSON.stringify(['sales', 'inventory', 'reports']),
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: JSON.stringify({ ar: 'احترافي', en: 'Professional' }),
                description: JSON.stringify({ ar: 'للشركات المتوسطة', en: 'For growing businesses' }),
                price: 249,
                durationDays: 30,
                maxBranches: 5,
                maxCashiers: 15,
                maxProducts: 2000,
                storageLimitMb: 2048,
                features: JSON.stringify(['sales', 'inventory', 'purchases', 'reports', 'multi-branch']),
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                name: JSON.stringify({ ar: 'مؤسسي', en: 'Enterprise' }),
                description: JSON.stringify({ ar: 'صلاحيات كاملة', en: 'Full platform access' }),
                price: 499,
                durationDays: 30,
                maxBranches: 50,
                maxCashiers: 200,
                maxProducts: 50000,
                storageLimitMb: 10240,
                features: JSON.stringify(['all']),
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        console.log('  ✅ Default subscription plans seeded');
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_subscription_plans', null, {});
    },
};
