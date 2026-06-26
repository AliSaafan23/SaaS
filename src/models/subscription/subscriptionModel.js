import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Subscription = sequelize.define(
    'Subscription',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        customerId: { type: DataTypes.INTEGER, allowNull: false },
        planId: { type: DataTypes.INTEGER, allowNull: false },
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.ENUM('active', 'cancelled', 'paused'), defaultValue: 'active' },
        nextBillingDate: { type: DataTypes.DATEONLY, allowNull: false },
    },
    { tableName: 'tbl_subscriptions' }
);

export default Subscription;
