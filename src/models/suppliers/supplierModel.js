import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Supplier = sequelize.define(
    'Supplier',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        supplier_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
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
        modelName: 'Supplier',
        tableName: 'tbl_suppliers',
        timestamps: true,
        indexes: [
            { fields: ['companyId'] },
            { fields: ['branchId'] },
            { unique: true, fields: ['companyId', 'branchId', 'supplier_code'] },
            { fields: ['name'] },
            { fields: ['phone'] },
        ],
    }
);

export default Supplier;
