import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const DEVICE_USER_REF = ['Admin', 'Cashier', 'Personal', 'Driver', 'Merchant'];
const DEVICE_TYPE = ['ios', 'android', 'web'];

const Device = sequelize.define(
    'Device',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        userRef: {
            type: DataTypes.ENUM(...DEVICE_USER_REF),
            allowNull: false,
            defaultValue: 'Admin',
        },
        fcmToken: {
            type: DataTypes.STRING(500),
            allowNull: false,
            defaultValue: '',
        },
        deviceType: {
            type: DataTypes.ENUM(...DEVICE_TYPE),
            allowNull: false,
        },
        deviceId: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        platform: {
            type: DataTypes.ENUM('desktop', 'mobile'),
            allowNull: true,
        },
    },
    {
        modelName: 'Device',
        tableName: 'tbl_devices',
        timestamps: true,
        indexes: [
            { fields: ['userId', 'userRef'] },
            { fields: ['deviceType'] },
            { fields: ['fcmToken'] },
        ],
    }
);

export default Device;
