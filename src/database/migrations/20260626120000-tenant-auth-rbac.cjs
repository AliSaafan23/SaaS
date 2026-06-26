const { DataTypes } = require('sequelize');

/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const { DataTypes: DT } = Sequelize;

        await queryInterface.addColumn('tbl_tenants', 'logo', {
            type: DT.STRING(500),
            allowNull: true,
        });
        await queryInterface.addColumn('tbl_tenants', 'companyEmail', {
            type: DT.STRING(200),
            allowNull: true,
        });

        await queryInterface.createTable('tbl_tenant_roles', {
            id: { type: DT.INTEGER, autoIncrement: true, primaryKey: true },
            tenantId: {
                type: DT.INTEGER,
                allowNull: false,
                references: { model: 'tbl_tenants', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            name: { type: DT.STRING(100), allowNull: false },
            slug: { type: DT.STRING(50), allowNull: false },
            permissions: { type: DT.JSONB, allowNull: false, defaultValue: [] },
            isSystem: { type: DT.BOOLEAN, defaultValue: false },
            createdAt: { type: DT.DATE, allowNull: false },
            updatedAt: { type: DT.DATE, allowNull: false },
        });
        await queryInterface.addIndex('tbl_tenant_roles', ['tenantId', 'slug'], { unique: true });

        await queryInterface.addColumn('tbl_tenant_users', 'roleId', {
            type: DT.INTEGER,
            allowNull: true,
            references: { model: 'tbl_tenant_roles', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
        await queryInterface.addColumn('tbl_tenant_users', 'emailVerified', {
            type: DT.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        });
        await queryInterface.changeColumn('tbl_tenant_users', 'emailVerified', {
            type: DT.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
        await queryInterface.addColumn('tbl_tenant_users', 'activationCode', {
            type: DT.STRING(10),
            allowNull: true,
        });
        await queryInterface.addColumn('tbl_tenant_users', 'activationCodeExpiresAt', {
            type: DT.DATE,
            allowNull: true,
        });

        await queryInterface.addColumn('tbl_customers', 'avatar', {
            type: DT.STRING(500),
            allowNull: true,
        });

        await queryInterface.removeIndex('tbl_tenant_users', ['tenantId', 'email']).catch(() => {});
        await queryInterface.addIndex('tbl_tenant_users', ['email'], { unique: true });

        await queryInterface.sequelize.query(`
            INSERT INTO tbl_tenant_roles ("tenantId", name, slug, permissions, "isSystem", "createdAt", "updatedAt")
            SELECT t.id, 'Owner', 'owner', '["*"]'::jsonb, true, NOW(), NOW()
            FROM tbl_tenants t
            WHERE NOT EXISTS (
                SELECT 1 FROM tbl_tenant_roles r WHERE r."tenantId" = t.id AND r.slug = 'owner'
            )
        `);

        await queryInterface.sequelize.query(`
            UPDATE tbl_tenant_users u
            SET "roleId" = r.id
            FROM tbl_tenant_roles r
            WHERE u."tenantId" = r."tenantId" AND r.slug = 'owner' AND u."roleId" IS NULL
        `);
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('tbl_tenant_users', ['email']).catch(() => {});
        await queryInterface.addIndex('tbl_tenant_users', ['tenantId', 'email'], { unique: true }).catch(() => {});

        await queryInterface.removeColumn('tbl_customers', 'avatar');
        await queryInterface.removeColumn('tbl_tenant_users', 'activationCodeExpiresAt');
        await queryInterface.removeColumn('tbl_tenant_users', 'activationCode');
        await queryInterface.removeColumn('tbl_tenant_users', 'emailVerified');
        await queryInterface.removeColumn('tbl_tenant_users', 'roleId');
        await queryInterface.dropTable('tbl_tenant_roles');
        await queryInterface.removeColumn('tbl_tenants', 'companyEmail');
        await queryInterface.removeColumn('tbl_tenants', 'logo');
    },
};
