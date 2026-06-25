import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Product = sequelize.define(
    'Product',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        barcode: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        image: {
            type: DataTypes.STRING(500),
            allowNull: true,
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
        category_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_categories',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        brand_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_brands',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        cost_price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        sale_price_1: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        sale_price_2: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        sale_price_3: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        quantity: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
            defaultValue: 0,
        },
        reorder_level: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
            defaultValue: 0,
        },
        tax_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
        },
        expiry_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        base_unit_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_units',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        large_unit_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_units',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        units_count: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
            defaultValue: 1,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        modelName: 'Product',
        tableName: 'tbl_products',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['companyId', 'branchId', 'barcode'] },
            { fields: ['companyId'] },
            { fields: ['branchId'] },
            { fields: ['category_id'] },
            { fields: ['brand_id'] },
            { fields: ['base_unit_id'] },
            { fields: ['large_unit_id'] },
            { fields: ['status'] },
            { fields: ['name'] },
        ],
    }
);

export default Product;
