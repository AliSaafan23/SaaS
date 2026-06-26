import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Payment = sequelize.define(
    'Payment',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        invoiceId: { type: DataTypes.INTEGER, allowNull: false },
        amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
    },
    { tableName: 'tbl_payments' }
);

export default Payment;
