import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Invoice = sequelize.define(
    'Invoice',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        customerId: { type: DataTypes.INTEGER, allowNull: false },
        subscriptionId: { type: DataTypes.INTEGER, allowNull: false },
        amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
        status: { type: DataTypes.ENUM('open', 'paid'), defaultValue: 'open' },
        periodStart: { type: DataTypes.DATEONLY, allowNull: false },
        periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
        issueDate: { type: DataTypes.DATEONLY, allowNull: false },
        revenueRecognizedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'tbl_invoices' }
);

export default Invoice;
