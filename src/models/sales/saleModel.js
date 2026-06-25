import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Sale = sequelize.define(
    'Sale',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        invoice_no: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
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
        invoice_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        item_discount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        invoice_discount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
        },
        tax_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        paid_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        due_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        sale_price_type: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
        },
        payment_method: {
            type: DataTypes.ENUM('cash', 'card', 'credit', 'cheque', 'mixed'),
            allowNull: false,
        },
        payment_method_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_payment_methods',
                key: 'id',
            },
            onDelete: 'SET NULL',
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
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('draft', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'completed',
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
        modelName: 'Sale',
        tableName: 'tbl_sales',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['branchId', 'invoice_no'] },
            { fields: ['branchId'] },
            { fields: ['customer_id'] },
            { fields: ['cashierId'] },
            { fields: ['invoice_date'] },
            { fields: ['payment_method'] },
            { fields: ['payment_method_id'] },
            { fields: ['status'] },
        ],
    }
);

export default Sale;
