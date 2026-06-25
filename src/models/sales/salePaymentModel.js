import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const SalePayment = sequelize.define(
    'SalePayment',
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
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
    },
    {
        modelName: 'SalePayment',
        tableName: 'tbl_sale_payments',
        timestamps: true,
        indexes: [
            { fields: ['sale_id'] },
            { fields: ['payment_method'] },
            { fields: ['payment_method_id'] },
        ],
    }
);

export default SalePayment;
