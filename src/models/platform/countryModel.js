import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const Country = sequelize.define(
    'Country',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        nameAr: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        nameEn: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(5),
            allowNull: false,
        },
        phoneCode: {
            type: DataTypes.STRING(10),
            allowNull: true,
            defaultValue: '',
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
        modelName: 'Country',
        tableName: 'tbl_countries',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['code'] },
            { fields: ['isActive', 'sortOrder'] },
        ],
    }
);

Country.prototype.getLocalizedName = function (lang = 'ar') {
    return lang === 'en' ? this.nameEn : this.nameAr;
};

export default Country;
