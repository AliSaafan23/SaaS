import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Purchase = sequelize.define(
    'Purchase',
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
        supplier_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_suppliers',
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
        payment_method: {
            type: DataTypes.ENUM('cash', 'card', 'credit', 'mixed'),
            allowNull: false,
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
        modelName: 'Purchase',
        tableName: 'tbl_purchases',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['invoice_no'] },
            { fields: ['branchId'] },
            { fields: ['supplier_id'] },
            { fields: ['invoice_date'] },
            { fields: ['payment_method'] },
            { fields: ['status'] },
        ],
    }
);

export default Purchase;
