import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PLATFORM = ['desktop', 'mobile'];
const SUB_STATUS = ['pending', 'active', 'expired', 'suspended'];

/** Company subscription per platform (Desktop / Mobile) */
const CompanySubscription = sequelize.define(
    'CompanySubscription',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        companyId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'tbl_companies', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        subscriptionPlanId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'tbl_subscription_plans', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        platform: { type: DataTypes.ENUM(...PLATFORM), allowNull: false, defaultValue: 'desktop' },
        status: { type: DataTypes.ENUM(...SUB_STATUS), allowNull: false, defaultValue: 'pending' },
        startsAt: { type: DataTypes.DATE, allowNull: true },
        expiresAt: { type: DataTypes.DATE, allowNull: true },
        activatedByAdminId: { type: DataTypes.BIGINT, allowNull: true },
        activatedAt: { type: DataTypes.DATE, allowNull: true },
        notes: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    },
    {
        tableName: 'tbl_company_subscriptions',
        indexes: [
            { unique: true, fields: ['companyId', 'platform'] },
            { fields: ['status'] },
            { fields: ['companyId'] },
        ],
    }
);

export default CompanySubscription;
