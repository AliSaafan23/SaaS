import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Tenant = sequelize.define(
    'Tenant',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(200), allowNull: false },
        slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
        status: { type: DataTypes.ENUM('active', 'suspended'), defaultValue: 'active' },
        logo: { type: DataTypes.STRING(500), allowNull: true },
        companyEmail: { type: DataTypes.STRING(200), allowNull: true },
    },
    { tableName: 'tbl_tenants' }
);

export default Tenant;
