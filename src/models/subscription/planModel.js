import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Plan = sequelize.define(
    'Plan',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(150), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        billingCycle: { type: DataTypes.ENUM('monthly', 'annual'), defaultValue: 'monthly' },
        currency: { type: DataTypes.STRING(10), defaultValue: 'USD' },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: 'tbl_plans' }
);

export default Plan;
