import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const PaymentMethod = sequelize.define(
    'PaymentMethod',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING(30),
            allowNull: false,
        },
        nameAr: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        nameEn: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        affectsCashbox: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        requiresCustomer: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        modelName: 'PaymentMethod',
        tableName: 'tbl_payment_methods',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['code'] },
            { fields: ['isActive', 'sortOrder'] },
        ],
    }
);

PaymentMethod.prototype.getLocalizedName = function (lang = 'ar') {
    return lang === 'en' ? this.nameEn : this.nameAr;
};

export default PaymentMethod;
