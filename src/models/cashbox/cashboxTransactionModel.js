import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const TRANSACTION_TYPES = [
    'sale',
    'purchase',
    'expense',
    'customer_payment',
    'supplier_payment',
    'deposit',
    'withdraw',
    'sale_return',
];

const CashboxTransaction = sequelize.define(
    'CashboxTransaction',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        type: {
            type: DataTypes.ENUM(...TRANSACTION_TYPES),
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        transaction_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        sale_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_sales',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        purchase_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_purchases',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        expense_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_expenses',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        customer_payment_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_customer_payments',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        supplier_payment_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_supplier_payments',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        sale_return_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_sale_returns',
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
        modelName: 'CashboxTransaction',
        tableName: 'tbl_cashbox_transactions',
        timestamps: true,
        indexes: [
            { fields: ['branchId'] },
            { fields: ['type'] },
            { fields: ['sale_id'] },
            { fields: ['purchase_id'] },
            { fields: ['expense_id'] },
            { fields: ['customer_payment_id'] },
            { fields: ['supplier_payment_id'] },
            { fields: ['sale_return_id'] },
            { fields: ['transaction_date'] },
        ],
    }
);

export default CashboxTransaction;
