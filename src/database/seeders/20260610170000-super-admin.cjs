'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const now = new Date();

        const [roles] = await queryInterface.sequelize.query(
            `SELECT id FROM tbl_roles WHERE isAdmin = 1 LIMIT 1`
        );

        let roleId = roles[0]?.id;

        if (!roleId) {
            await queryInterface.bulkInsert('tbl_roles', [
                {
                    name: JSON.stringify({ ar: 'مدير النظام', en: 'Super Admin' }),
                    description: JSON.stringify({ ar: 'صلاحيات كاملة', en: 'Full access' }),
                    permissions: JSON.stringify(['all']),
                    isAdmin: true,
                    isDeleted: false,
                    isActive: true,
                    color: '#696cff',
                    adminsCount: 1,
                    createdAt: now,
                    updatedAt: now,
                },
            ]);

            const [inserted] = await queryInterface.sequelize.query(
                `SELECT id FROM tbl_roles WHERE isAdmin = 1 ORDER BY id DESC LIMIT 1`
            );
            roleId = inserted[0].id;
        }

        const [admins] = await queryInterface.sequelize.query(
            `SELECT id FROM tbl_admins WHERE email = 'mohamed@gmail.com' LIMIT 1`
        );

        if (admins.length === 0) {
            const password = await bcrypt.hash('Mohamed@12', 8);

            await queryInterface.bulkInsert('tbl_admins', [
                {
                    name: 'Super Admin',
                    phone: '01122222222',
                    email: 'mohamed@gmail.com',
                    password,
                    avatar: 'default.jpg',
                    language: 'ar',
                    userType: 'admin',
                    status: 'active',
                    isNotify: true,
                    isAdmin: true,
                    isHidden: false,
                    canEdit: true,
                    canDelete: true,
                    notifyCount: 0,
                    active: true,
                    role_id: roleId,
                    theme: 'light',
                    createdAt: now,
                    updatedAt: now,
                },
            ]);
        }

        console.log('  ✅ Super admin seeded (mohamed@gmail.com / Mohamed@12)');
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('tbl_admins', { email: 'mohamed@gmail.com' });
        await queryInterface.bulkDelete('tbl_roles', { isAdmin: true });
    },
};
