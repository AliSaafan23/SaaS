import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const POLICY_TYPE = ['privacy', 'terms', 'about'];

const Policy = sequelize.define(
    'Policy',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        type: {
            type: DataTypes.ENUM(...POLICY_TYPE),
            allowNull: false,
            unique: true,
        },
        items: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
            comment: 'Array of { title: {ar,en}, description: {ar,en} }',
        },
        contactInfo: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ phone, email, supportEmail }',
        },
        socialMedia: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ instagram, facebook, telegram, twitter }',
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        version: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: '1.0',
        },
    },
    {
        modelName: 'Policy',
        tableName: 'tbl_policies',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['type'] },
            { fields: ['isActive'] },
        ],
    }
);

export default Policy;
