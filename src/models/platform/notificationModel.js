import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const NOTIFICATION_TYPE = ['system', 'subscription', 'promotional'];
const TARGET_TYPE = ['all', 'company', 'branch', 'user'];

const Notification = sequelize.define(
    'Notification',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING(255), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        type: { type: DataTypes.ENUM(...NOTIFICATION_TYPE), allowNull: false, defaultValue: 'system' },
        targetType: { type: DataTypes.ENUM(...TARGET_TYPE), allowNull: false, defaultValue: 'all' },
        targetId: { type: DataTypes.BIGINT, allowNull: true },
        sentByAdminId: { type: DataTypes.BIGINT, allowNull: true },
    },
    { tableName: 'tbl_notifications' }
);

export default Notification;
