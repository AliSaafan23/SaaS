import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const SaleItem = sequelize.define(
    'SaleItem',
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
        product_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_products',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        qty: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
        },
        price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        discount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        tax: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
    },
    {
        modelName: 'SaleItem',
        tableName: 'tbl_sale_items',
        timestamps: true,
        indexes: [
            { fields: ['sale_id'] },
            { fields: ['product_id'] },
        ],
    }
);

export default SaleItem;
