import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const DEVICE_TYPE = ['ios', 'android', 'web'];
const PLATFORM = ['desktop', 'mobile'];
const LINKED_USER_REF = ['Merchant', 'Cashier'];

const AppInstall = sequelize.define(
    'AppInstall',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        deviceId: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        deviceType: {
            type: DataTypes.ENUM(...DEVICE_TYPE),
            allowNull: false,
        },
        platform: {
            type: DataTypes.ENUM(...PLATFORM),
            allowNull: false,
            defaultValue: 'mobile',
        },
        countryId: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            defaultValue: '',
        },
        userAgent: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: '',
        },
        appVersion: {
            type: DataTypes.STRING(30),
            allowNull: true,
            defaultValue: '',
        },
        deviceModel: {
            type: DataTypes.STRING(120),
            allowNull: true,
            defaultValue: '',
        },
        osVersion: {
            type: DataTypes.STRING(60),
            allowNull: true,
            defaultValue: '',
        },
        geoData: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        linkedUserId: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        linkedUserRef: {
            type: DataTypes.ENUM(...LINKED_USER_REF),
            allowNull: true,
        },
        installedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        lastSeenAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        modelName: 'AppInstall',
        tableName: 'tbl_app_installs',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['deviceId', 'deviceType'] },
            { fields: ['countryId'] },
            { fields: ['platform', 'deviceType'] },
            { fields: ['installedAt'] },
            { fields: ['linkedUserId', 'linkedUserRef'] },
        ],
    }
);

export default AppInstall;
