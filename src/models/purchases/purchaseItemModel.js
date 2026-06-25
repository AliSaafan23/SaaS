import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PurchaseItem = sequelize.define(
    'PurchaseItem',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        purchase_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'tbl_purchases',
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
        modelName: 'PurchaseItem',
        tableName: 'tbl_purchase_items',
        timestamps: true,
        indexes: [
            { fields: ['purchase_id'] },
            { fields: ['product_id'] },
        ],
    }
);

export default PurchaseItem;
