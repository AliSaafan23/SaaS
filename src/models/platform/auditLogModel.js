import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const AuditLog = sequelize.define(
    'AuditLog',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.BIGINT, allowNull: true },
        userRef: { type: DataTypes.STRING(50), allowNull: true },
        userName: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
        action: { type: DataTypes.STRING(100), allowNull: false },
        module: { type: DataTypes.STRING(100), allowNull: false },
        ipAddress: { type: DataTypes.STRING(45), allowNull: true },
        metadata: { type: DataTypes.JSON, allowNull: true },
    },
    {
        tableName: 'tbl_audit_logs',
        updatedAt: false,
        indexes: [{ fields: ['module'] }, { fields: ['createdAt'] }],
    }
);

export default AuditLog;
