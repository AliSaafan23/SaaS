import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const ExpenseCategory = sequelize.define(
    'ExpenseCategory',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        companyId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_companies',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    {
        modelName: 'ExpenseCategory',
        tableName: 'tbl_expense_categories',
        timestamps: true,
        indexes: [
            { fields: ['companyId'] },
            { fields: ['name'] },
        ],
    }
);

export default ExpenseCategory;
