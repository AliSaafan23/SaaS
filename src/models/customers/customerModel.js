import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Customer = sequelize.define(
    'Customer',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        customer_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        barcode: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        tax_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        material_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        commercial_register: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        statistical_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        price_level: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
        },
        credit_limit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0.00,
        },
        late_days_limit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        opening_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0.00,
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
        modelName: 'Customer',
        tableName: 'tbl_customers',
        timestamps: true,
        indexes: [
            { fields: ['companyId'] },
            { fields: ['branchId'] },
            { unique: true, fields: ['companyId', 'branchId', 'customer_code'] },
            { unique: true, fields: ['companyId', 'branchId', 'barcode'] },
            { fields: ['name'] },
            { fields: ['phone'] },
        ],
    }
);

export default Customer;
