import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const SaleReturn = sequelize.define(
    'SaleReturn',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        sale_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_sales',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        customer_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_customers',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        return_no: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        cashierId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_cashiers',
                key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        },
    },
    {
        modelName: 'SaleReturn',
        tableName: 'tbl_sale_returns',
        timestamps: true,
        indexes: [
            { fields: ['sale_id'] },
            { fields: ['customer_id'] },
            { fields: ['branchId'] },
        ],
    }
);

export default SaleReturn;
