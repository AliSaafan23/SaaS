'use strict';

const DEFAULT_COUNTRIES = [
    { nameAr: 'مصر', nameEn: 'Egypt', code: 'EG', phoneCode: '+20', sortOrder: 1 },
    { nameAr: 'السعودية', nameEn: 'Saudi Arabia', code: 'SA', phoneCode: '+966', sortOrder: 2 },
    { nameAr: 'الإمارات', nameEn: 'United Arab Emirates', code: 'AE', phoneCode: '+971', sortOrder: 3 },
    { nameAr: 'الكويت', nameEn: 'Kuwait', code: 'KW', phoneCode: '+965', sortOrder: 4 },
    { nameAr: 'قطر', nameEn: 'Qatar', code: 'QA', phoneCode: '+974', sortOrder: 5 },
    { nameAr: 'البحرين', nameEn: 'Bahrain', code: 'BH', phoneCode: '+973', sortOrder: 6 },
    { nameAr: 'عُمان', nameEn: 'Oman', code: 'OM', phoneCode: '+968', sortOrder: 7 },
    { nameAr: 'الأردن', nameEn: 'Jordan', code: 'JO', phoneCode: '+962', sortOrder: 8 },
    { nameAr: 'لبنان', nameEn: 'Lebanon', code: 'LB', phoneCode: '+961', sortOrder: 9 },
    { nameAr: 'العراق', nameEn: 'Iraq', code: 'IQ', phoneCode: '+964', sortOrder: 10 },
    { nameAr: 'ليبيا', nameEn: 'Libya', code: 'LY', phoneCode: '+218', sortOrder: 11 },
    { nameAr: 'المغرب', nameEn: 'Morocco', code: 'MA', phoneCode: '+212', sortOrder: 12 },
    { nameAr: 'تونس', nameEn: 'Tunisia', code: 'TN', phoneCode: '+216', sortOrder: 13 },
    { nameAr: 'الجزائر', nameEn: 'Algeria', code: 'DZ', phoneCode: '+213', sortOrder: 14 },
    { nameAr: 'السودان', nameEn: 'Sudan', code: 'SD', phoneCode: '+249', sortOrder: 15 },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const now = new Date();

        for (const country of DEFAULT_COUNTRIES) {
            const [rows] = await queryInterface.sequelize.query(
                'SELECT id FROM tbl_countries WHERE code = :code LIMIT 1',
                { replacements: { code: country.code } }
            );

            const payload = {
                nameAr: country.nameAr,
                nameEn: country.nameEn,
                code: country.code,
                phoneCode: country.phoneCode,
                isActive: true,
                sortOrder: country.sortOrder,
                updatedAt: now,
            };

            if (rows.length) {
                await queryInterface.bulkUpdate('tbl_countries', payload, { code: country.code });
            } else {
                await queryInterface.bulkInsert('tbl_countries', [
                    { ...payload, createdAt: now },
                ]);
            }
        }

        console.log(`  ✅ Countries seeded/updated (${DEFAULT_COUNTRIES.length})`);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_countries', {
            code: DEFAULT_COUNTRIES.map((c) => c.code),
        });
    },
};
