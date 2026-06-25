import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Expense = sequelize.define(
    'Expense',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        expense_category_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_expense_categories',
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
        expense_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        modelName: 'Expense',
        tableName: 'tbl_expenses',
        timestamps: true,
        indexes: [
            { fields: ['branchId'] },
            { fields: ['expense_category_id'] },
            { fields: ['expense_date'] },
            { fields: ['payment_method'] },
        ],
    }
);

export default Expense;
