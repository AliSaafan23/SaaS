'use strict';

/**
 * 4 خطط ثابتة: desktop/mobile × online/offline
 * المفتاح الفريد: platform + deploymentTier
 */
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

        const onlineFeatures = JSON.stringify(['all']);

        const plans = [
            {
                platform: 'desktop',
                deploymentTier: 'online',
                name: JSON.stringify({ ar: 'POS أونلاين — Desktop', en: 'Online POS — Desktop' }),
                description: JSON.stringify({
                    ar: 'نقطة بيع سحابية للكمبيوتر — بيانات على السيرفر',
                    en: 'Cloud POS for desktop — server-backed data',
                }),
                billingCycle: 'monthly',
                price: 5000,
                durationDays: 30,
                maxProducts: 10000,
                maxDevices: 2,
                maxBranches: 3,
                storageLimitMb: 5120,
                features: onlineFeatures,
            },
            {
                platform: 'mobile',
                deploymentTier: 'online',
                name: JSON.stringify({ ar: 'POS أونلاين — Mobile', en: 'Online POS — Mobile' }),
                description: JSON.stringify({
                    ar: 'نقطة بيع سحابية للموبايل — بيانات على السيرفر',
                    en: 'Cloud POS for mobile — server-backed data',
                }),
                billingCycle: 'monthly',
                price: 1500,
                durationDays: 30,
                maxProducts: 5000,
                maxDevices: 3,
                maxBranches: 2,
                storageLimitMb: 2048,
                features: onlineFeatures,
            },
            {
                platform: 'desktop',
                deploymentTier: 'offline',
                name: JSON.stringify({ ar: 'POS أوفلاين — Desktop', en: 'Offline POS — Desktop' }),
                description: JSON.stringify({
                    ar: 'نسخة سطح المكتب تعمل بدون إنترنت بعد التفعيل',
                    en: 'Desktop edition — works offline after license activation',
                }),
                billingCycle: 'annual',
                price: 6000,
                durationDays: 365,
                maxProducts: 20000,
                maxDevices: 2,
                maxBranches: 1,
                storageLimitMb: 0,
                features: offlineFeatures,
            },
            {
                platform: 'mobile',
                deploymentTier: 'offline',
                name: JSON.stringify({ ar: 'POS أوفلاين — Mobile', en: 'Offline POS — Mobile' }),
                description: JSON.stringify({
                    ar: 'نسخة الموبايل تعمل بدون إنترنت بعد التفعيل',
                    en: 'Mobile edition — works offline after license activation',
                }),
                billingCycle: 'annual',
                price: 2500,
                durationDays: 365,
                maxProducts: 10000,
                maxDevices: 3,
                maxBranches: 1,
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
                maxBranches: plan.maxBranches,
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
                console.log(`  ✅ Updated ${plan.deploymentTier} ${plan.platform}`);
            } else {
                await queryInterface.bulkInsert('tbl_subscription_plans', [
                    { ...payload, createdAt: now },
                ]);
                console.log(`  ✅ Created ${plan.deploymentTier} ${plan.platform}`);
            }
        }

        // ترقية أي خطط قديمة بدون deploymentTier (لو موجودة)
        await queryInterface.sequelize.query(
            `UPDATE tbl_subscription_plans SET deploymentTier = 'online'
             WHERE deploymentTier IS NULL OR deploymentTier = ''`
        );
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_subscription_plans', {
            deploymentTier: ['online', 'offline'],
        });
    },
};
