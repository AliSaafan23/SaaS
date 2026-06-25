import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PurchaseReturnItem = sequelize.define(
    'PurchaseReturnItem',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        purchase_return_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_purchase_returns',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        purchase_item_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_purchase_items',
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
        cost_price: {
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
        modelName: 'PurchaseReturnItem',
        tableName: 'tbl_purchase_return_items',
        timestamps: true,
        indexes: [
            { fields: ['purchase_return_id'] },
            { fields: ['purchase_item_id'] },
            { fields: ['product_id'] },
        ],
    }
);

export default PurchaseReturnItem;
