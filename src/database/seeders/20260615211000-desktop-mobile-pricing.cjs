'use strict';

/** Desktop 5000 EGP + Mobile 1500 EGP */
module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const plans = [
            {
                key: 'desktop',
                name: JSON.stringify({ ar: 'نسخة Desktop', en: 'Desktop POS' }),
                description: JSON.stringify({ ar: 'برنامج كاشير للكمبيوتر', en: 'Desktop cashier POS' }),
                platform: 'desktop',
                billingCycle: 'monthly',
                price: 5000,
                durationDays: 30,
                maxProducts: 10000,
                maxDevices: 2,
                storageLimitMb: 5120,
                features: JSON.stringify(['all']),
            },
            {
                key: 'mobile',
                name: JSON.stringify({ ar: 'نسخة Android', en: 'Android POS' }),
                description: JSON.stringify({ ar: 'برنامج كاشير للموبايل', en: 'Mobile POS cashier' }),
                platform: 'mobile',
                billingCycle: 'monthly',
                price: 1500,
                durationDays: 30,
                maxProducts: 5000,
                maxDevices: 3,
                storageLimitMb: 2048,
                features: JSON.stringify(['all']),
            },
        ];

        for (const plan of plans) {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT id FROM tbl_subscription_plans WHERE platform = :platform LIMIT 1`,
                { replacements: { platform: plan.key } }
            );

            const payload = {
                name: plan.name,
                description: plan.description,
                platform: plan.platform,
                billingCycle: plan.billingCycle,
                price: plan.price,
                durationDays: plan.durationDays,
                maxProducts: plan.maxProducts,
                maxDevices: plan.maxDevices,
                storageLimitMb: plan.storageLimitMb,
                features: plan.features,
                isActive: true,
                updatedAt: now,
            };

            if (rows.length) {
                await queryInterface.bulkUpdate(
                    'tbl_subscription_plans',
                    payload,
                    { platform: plan.platform }
                );
                console.log(`  ✅ Updated ${plan.platform} plan → ${plan.price} EGP`);
            } else {
                await queryInterface.bulkInsert('tbl_subscription_plans', [
                    { ...payload, createdAt: now },
                ]);
                console.log(`  ✅ Created ${plan.platform} plan → ${plan.price} EGP`);
            }
        }
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_subscription_plans', {
            platform: ['desktop', 'mobile'],
        });
    },
};
