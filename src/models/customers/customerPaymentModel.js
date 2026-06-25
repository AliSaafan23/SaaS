import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const CustomerPayment = sequelize.define(
    'CustomerPayment',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        customer_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_customers',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        payment_method: {
            type: DataTypes.ENUM('cash', 'card', 'credit', 'cheque'),
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
        payment_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        modelName: 'CustomerPayment',
        tableName: 'tbl_customer_payments',
        timestamps: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['payment_date'] },
            { fields: ['payment_method'] },
        ],
    }
);

export default CustomerPayment;
