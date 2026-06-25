import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PLATFORM = ['desktop', 'mobile'];
const PAY_STATUS = ['pending', 'paid', 'failed', 'refunded'];
const PAY_METHOD = ['manual', 'paymob'];

const SubscriptionPayment = sequelize.define(
    'SubscriptionPayment',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        companyId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'tbl_companies', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        companySubscriptionId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'tbl_company_subscriptions', key: 'id' },
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
        platform: { type: DataTypes.ENUM(...PLATFORM), allowNull: false },
        amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'EGP' },
        status: { type: DataTypes.ENUM(...PAY_STATUS), allowNull: false, defaultValue: 'pending' },
        method: { type: DataTypes.ENUM(...PAY_METHOD), allowNull: false, defaultValue: 'manual' },
        merchantOrderId: { type: DataTypes.STRING(100), allowNull: true },
        gatewayOrderId: { type: DataTypes.STRING(100), allowNull: true },
        gatewayTransactionId: { type: DataTypes.STRING(100), allowNull: true },
        paidAt: { type: DataTypes.DATE, allowNull: true },
        confirmedByAdminId: { type: DataTypes.BIGINT, allowNull: true },
        notes: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
        receiptImage: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
        receiptUploadedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: 'tbl_subscription_payments',
        indexes: [
            { fields: ['companyId'] },
            { fields: ['status'] },
            { fields: ['merchantOrderId'] },
        ],
    }
);

export default SubscriptionPayment;
