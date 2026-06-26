import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Account = sequelize.define(
    'Account',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        code: { type: DataTypes.STRING(20), allowNull: false },
        name: { type: DataTypes.STRING(150), allowNull: false },
        nameAr: { type: DataTypes.STRING(150), allowNull: true },
        type: { type: DataTypes.ENUM('asset', 'liability', 'revenue', 'expense'), allowNull: false },
        normalBalance: { type: DataTypes.ENUM('debit', 'credit'), allowNull: false },
    },
    { tableName: 'tbl_accounts' }
);

export default Account;
