import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const SystemSetting = sequelize.define(
    'SystemSetting',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        settingKey: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        settingValue: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'tbl_system_settings' }
);

export default SystemSetting;
