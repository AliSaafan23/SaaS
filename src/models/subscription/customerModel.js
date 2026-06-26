import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Customer = sequelize.define(
    'Customer',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(200), allowNull: false },
        email: { type: DataTypes.STRING(200), allowNull: true },
        phone: { type: DataTypes.STRING(50), allowNull: true },
        avatar: { type: DataTypes.STRING(500), allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
    },
    { tableName: 'tbl_customers' }
);

export default Customer;
