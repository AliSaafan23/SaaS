import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Unit = sequelize.define(
    'Unit',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        companyId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        branchId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_branches',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    {
        modelName: 'Unit',
        tableName: 'tbl_units',
        timestamps: true,
        indexes: [
            { fields: ['companyId'] },
            { fields: ['branchId'] },
            { unique: true, fields: ['companyId', 'branchId', 'name'] },
            { fields: ['name'] },
        ],
    }
);

export default Unit;
