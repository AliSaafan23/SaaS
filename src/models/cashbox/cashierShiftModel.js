import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const CashierShift = sequelize.define(
    'CashierShift',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        branchId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'tbl_branches', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        cashierId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'tbl_cashiers', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        opening_cash: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        closing_cash: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
        opened_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        closed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        modelName: 'CashierShift',
        tableName: 'tbl_cashier_shifts',
        timestamps: true,
        indexes: [
            { fields: ['branchId'] },
            { fields: ['cashierId'] },
            { fields: ['branchId', 'cashierId', 'closed_at'] },
        ],
    }
);

export default CashierShift;
