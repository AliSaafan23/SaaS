import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const SaleReturnItem = sequelize.define(
    'SaleReturnItem',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        sale_return_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_sale_returns',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        sale_item_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_sale_items',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
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
        modelName: 'SaleReturnItem',
        tableName: 'tbl_sale_return_items',
        timestamps: true,
        indexes: [
            { fields: ['sale_return_id'] },
            { fields: ['sale_item_id'] },
            { fields: ['product_id'] },
        ],
    }
);

export default SaleReturnItem;
