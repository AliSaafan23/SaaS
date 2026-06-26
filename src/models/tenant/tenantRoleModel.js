import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const TenantRole = sequelize.define(
    'TenantRole',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        slug: { type: DataTypes.STRING(50), allowNull: false },
        permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
        isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'tbl_tenant_roles' }
);

export default TenantRole;
