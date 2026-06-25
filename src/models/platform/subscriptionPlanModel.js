import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PLATFORM = ['desktop', 'mobile'];
const BILLING_CYCLE = ['monthly', 'annual', 'lifetime'];

const SubscriptionPlan = sequelize.define(
    'SubscriptionPlan',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.JSON, allowNull: false },
        description: { type: DataTypes.JSON, allowNull: true },
        platform: { type: DataTypes.ENUM(...PLATFORM), allowNull: false, defaultValue: 'desktop' },
        deploymentTier: { type: DataTypes.ENUM('offline', 'online'), allowNull: false, defaultValue: 'online' },
        billingCycle: { type: DataTypes.ENUM(...BILLING_CYCLE), allowNull: false, defaultValue: 'monthly' },
        price: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        durationDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
        maxProducts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
        maxDevices: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        maxBranches: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        storageLimitMb: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1024 },
        features: { type: DataTypes.JSON, allowNull: true },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'tbl_subscription_plans' }
);

SubscriptionPlan.prototype.getLocalizedName = function (lang = 'ar') {
    return this.name?.[lang] || this.name?.ar || '';
};

SubscriptionPlan.prototype.getLocalizedDescription = function (lang = 'ar') {
    return this.description?.[lang] || this.description?.ar || '';
};

export default SubscriptionPlan;
