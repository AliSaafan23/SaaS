import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const DailyOnlineTime = sequelize.define(
    'DailyOnlineTime',
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
        userType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'admin, cashier, personal, driver',
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        totalOnlineTime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Total online time in minutes for this date',
        },
    },
    {
        modelName: 'DailyOnlineTime',
        tableName: 'tbl_daily_online_times',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['userId', 'userType', 'date'] },
            { fields: ['date'] },
        ],
    }
);

export default DailyOnlineTime;
