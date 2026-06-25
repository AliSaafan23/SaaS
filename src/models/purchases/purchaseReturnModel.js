import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PurchaseReturn = sequelize.define(
    'PurchaseReturn',
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
        supplier_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_suppliers',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        modelName: 'PurchaseReturn',
        tableName: 'tbl_purchase_returns',
        timestamps: true,
        indexes: [
            { fields: ['purchase_id'] },
            { fields: ['supplier_id'] },
        ],
    }
);

export default PurchaseReturn;
