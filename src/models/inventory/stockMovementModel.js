import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const StockMovement = sequelize.define(
    'StockMovement',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
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
        movement_type: {
            type: DataTypes.ENUM(
                'sale',
                'purchase',
                'sale_return',
                'purchase_return',
                'inventory',
                'manual_add',
                'manual_subtract'
            ),
            allowNull: false,
        },
        qty_before: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
            defaultValue: 0,
        },
        qty: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
        },
        qty_after: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
            defaultValue: 0,
        },
        sale_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_sales',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        purchase_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_purchases',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        sale_return_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_sale_returns',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        purchase_return_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'tbl_purchase_returns',
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
        modelName: 'StockMovement',
        tableName: 'tbl_stock_movements',
        timestamps: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['branchId'] },
            { fields: ['movement_type'] },
            { fields: ['sale_id'] },
            { fields: ['purchase_id'] },
            { fields: ['sale_return_id'] },
            { fields: ['purchase_return_id'] },
        ],
    }
);

export default StockMovement;
