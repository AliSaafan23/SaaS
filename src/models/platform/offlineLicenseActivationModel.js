import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const OfflineLicenseActivation = sequelize.define(
    'OfflineLicenseActivation',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        cashierId: { type: DataTypes.BIGINT, allowNull: false },
        companyId: { type: DataTypes.BIGINT, allowNull: false },
        branchId: { type: DataTypes.BIGINT, allowNull: false },
        deviceId: { type: DataTypes.STRING(100), allowNull: false },
        platform: { type: DataTypes.ENUM('desktop', 'mobile'), allowNull: false },
        deviceType: { type: DataTypes.STRING(32), allowNull: true, defaultValue: '' },
        licenseExpiresAt: { type: DataTypes.DATE, allowNull: true },
        activatedAt: { type: DataTypes.DATE, allowNull: false },
        lastRefreshAt: { type: DataTypes.DATE, allowNull: true },
        revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'tbl_offline_license_activations' }
);

export default OfflineLicenseActivation;
