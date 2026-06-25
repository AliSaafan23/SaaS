'use strict';

/** Offline desktop + mobile plans (separate from online SaaS plans) */
module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const offlineFeatures = JSON.stringify([
            'sales.view',
            'sales.create',
            'sales.return',
            'inventory.view',
            'inventory.create',
            'customers.view',
            'customers.create',
            'suppliers.view',
            'suppliers.create',
            'purchases.view',
            'purchases.create',
            'cashbox.view',
            'cashbox.deposit',
            'cashbox.withdraw',
            'expenses.view',
            'expenses.create',
            'reports.view',
            'reports.daily',
        ]);

        await queryInterface.sequelize.query(
            `UPDATE tbl_subscription_plans SET deploymentTier = 'online' WHERE deploymentTier IS NULL OR deploymentTier = ''`
        );

        const plans = [
            {
                platform: 'desktop',
                deploymentTier: 'offline',
                name: JSON.stringify({ ar: 'POS أوفلاين — Desktop', en: 'Offline POS — Desktop' }),
                description: JSON.stringify({
                    ar: 'نسخة سطح المكتب تعمل بدون إنترنت بعد التفعيل',
                    en: 'Desktop edition — works offline after activation',
                }),
                billingCycle: 'annual',
                price: 6000,
                durationDays: 365,
                maxProducts: 20000,
                maxDevices: 2,
                storageLimitMb: 0,
                features: offlineFeatures,
            },
            {
                platform: 'mobile',
                deploymentTier: 'offline',
                name: JSON.stringify({ ar: 'POS أوفلاين — Mobile', en: 'Offline POS — Mobile' }),
                description: JSON.stringify({
                    ar: 'نسخة الموبايل تعمل بدون إنترنت بعد التفعيل',
                    en: 'Mobile edition — works offline after activation',
                }),
                billingCycle: 'annual',
                price: 2500,
                durationDays: 365,
                maxProducts: 10000,
                maxDevices: 3,
                storageLimitMb: 0,
                features: offlineFeatures,
            },
        ];

        for (const plan of plans) {
            const [rows] = await queryInterface.sequelize.query(
                `SELECT id FROM tbl_subscription_plans
                 WHERE platform = :platform AND deploymentTier = :deploymentTier
                 LIMIT 1`,
                { replacements: { platform: plan.platform, deploymentTier: plan.deploymentTier } }
            );

            const payload = {
                name: plan.name,
                description: plan.description,
                platform: plan.platform,
                deploymentTier: plan.deploymentTier,
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
                    { platform: plan.platform, deploymentTier: plan.deploymentTier }
                );
                console.log(`  ✅ Updated offline ${plan.platform} plan`);
            } else {
                await queryInterface.bulkInsert('tbl_subscription_plans', [
                    { ...payload, createdAt: now },
                ]);
                console.log(`  ✅ Created offline ${plan.platform} plan`);
            }
        }
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_subscription_plans', {
            deploymentTier: 'offline',
        });
    },
};
