import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Role = sequelize.define(
    'Role',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: '{ ar, en }',
        },
        description: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: { ar: '', en: '' },
            comment: '{ ar, en }',
        },
        permissions: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        isAdmin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: '#696cff',
        },
        adminsCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        modelName: 'Role',
        tableName: 'tbl_roles',
        timestamps: true,
        defaultScope: {
            where: { isDeleted: false },
        },
        scopes: {
            withDeleted: {},
        },
        indexes: [
            { fields: ['isActive'] },
            { fields: ['isDeleted'] },
        ],
    }
);

Role.prototype.getLocalizedName = function (lang = 'ar') {
    return this.name?.[lang] || this.name?.ar || '';
};

Role.prototype.getLocalizedDescription = function (lang = 'ar') {
    return this.description?.[lang] || this.description?.ar || '';
};

export default Role;
