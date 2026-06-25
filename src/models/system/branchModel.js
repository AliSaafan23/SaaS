import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const BRANCH_STATUS = ['active', 'inactive'];

const Branch = sequelize.define(
    'Branch',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        companyId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'tbl_companies', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: '',
        },
        phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
            defaultValue: '',
        },
        status: {
            type: DataTypes.ENUM(...BRANCH_STATUS),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        modelName: 'Branch',
        tableName: 'tbl_branches',
        timestamps: true,
        indexes: [
            { fields: ['companyId'] },
            { fields: ['status'] },
        ],
    }
);

export default Branch;
