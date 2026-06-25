'use strict';

const DEFAULT_METHODS = [
    {
        code: 'cash',
        nameAr: 'نقداً',
        nameEn: 'Cash',
        affectsCashbox: true,
        requiresCustomer: false,
        sortOrder: 1,
    },
    {
        code: 'credit',
        nameAr: 'آجل',
        nameEn: 'Credit',
        affectsCashbox: false,
        requiresCustomer: true,
        sortOrder: 2,
    },
    {
        code: 'cheque',
        nameAr: 'شيك',
        nameEn: 'Cheque',
        affectsCashbox: true,
        requiresCustomer: false,
        sortOrder: 3,
    },
    {
        code: 'card',
        nameAr: 'بطاقة',
        nameEn: 'Card',
        affectsCashbox: true,
        requiresCustomer: false,
        sortOrder: 4,
    },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const now = new Date();

        for (const method of DEFAULT_METHODS) {
            const [existing] = await queryInterface.sequelize.query(
                `SELECT id FROM tbl_payment_methods WHERE code = :code LIMIT 1`,
                { replacements: { code: method.code }, type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            if (existing?.id) {
                await queryInterface.bulkUpdate(
                    'tbl_payment_methods',
                    {
                        nameAr: method.nameAr,
                        nameEn: method.nameEn,
                        affectsCashbox: method.affectsCashbox,
                        requiresCustomer: method.requiresCustomer,
                        sortOrder: method.sortOrder,
                        isActive: true,
                        updatedAt: now,
                    },
                    { code: method.code }
                );
            } else {
                await queryInterface.bulkInsert('tbl_payment_methods', [
                    {
                        ...method,
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                ]);
            }
        }

        const methods = await queryInterface.sequelize.query(
            `SELECT id, code FROM tbl_payment_methods`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const byCode = Object.fromEntries(methods.map((m) => [m.code, m.id]));

        await queryInterface.sequelize.query(`
            UPDATE tbl_sales
            SET payment_method_id = CASE payment_method
                WHEN 'cash' THEN :cash
                WHEN 'card' THEN :card
                WHEN 'credit' THEN :credit
                WHEN 'cheque' THEN :cheque
                WHEN 'mixed' THEN :cash
                ELSE :cash
            END
            WHERE payment_method_id IS NULL
        `, {
            replacements: {
                cash: byCode.cash,
                card: byCode.card,
                credit: byCode.credit,
                cheque: byCode.cheque,
            },
        });

        await queryInterface.sequelize.query(`
            UPDATE tbl_sale_payments sp
            INNER JOIN tbl_payment_methods pm ON pm.code = sp.payment_method
            SET sp.payment_method_id = pm.id
            WHERE sp.payment_method_id IS NULL
        `);

        await queryInterface.sequelize.query(`
            UPDATE tbl_customer_payments cp
            INNER JOIN tbl_payment_methods pm ON pm.code = cp.payment_method
            SET cp.payment_method_id = pm.id
            WHERE cp.payment_method_id IS NULL
        `);

        console.log('  ✅ Default payment methods seeded');
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_payment_methods', {
            code: DEFAULT_METHODS.map((m) => m.code),
        });
    },
};
