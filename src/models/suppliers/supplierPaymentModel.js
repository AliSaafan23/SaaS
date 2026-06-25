import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const SupplierPayment = sequelize.define(
    'SupplierPayment',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        supplier_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_suppliers',
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
            type: DataTypes.ENUM('cash', 'card', 'cheque'),
            allowNull: false,
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
        modelName: 'SupplierPayment',
        tableName: 'tbl_supplier_payments',
        timestamps: true,
        indexes: [
            { fields: ['supplier_id'] },
            { fields: ['payment_date'] },
            { fields: ['payment_method'] },
        ],
    }
);

export default SupplierPayment;
