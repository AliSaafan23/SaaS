import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/dbConfig.js';

const TenantUser = sequelize.define(
    'TenantUser',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(150), allowNull: false },
        email: { type: DataTypes.STRING(200), allowNull: false },
        password: { type: DataTypes.STRING(255), allowNull: false },
        roleId: { type: DataTypes.INTEGER, allowNull: true },
        status: { type: DataTypes.ENUM('active', 'block', 'delete'), defaultValue: 'active' },
        emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        activationCode: { type: DataTypes.STRING(10), allowNull: true },
        activationCodeExpiresAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: 'tbl_tenant_users',
        defaultScope: { attributes: { exclude: ['password', 'activationCode'] } },
        scopes: { withPassword: { attributes: {} } },
    }
);

TenantUser.beforeCreate(async (user) => {
    if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

TenantUser.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

TenantUser.prototype.comparePassword = async function comparePassword(plain) {
    return bcrypt.compare(plain, this.password);
};

export default TenantUser;
