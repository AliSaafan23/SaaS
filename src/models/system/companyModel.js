import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const COMPANY_STATUS = ['pending', 'active', 'suspended'];

const Company = sequelize.define(
    'Company',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
            defaultValue: '',
        },
        address: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: '',
        },
        logo: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: 'default_company.png',
        },
        status: {
            type: DataTypes.ENUM(...COMPANY_STATUS),
            allowNull: false,
            defaultValue: 'pending',
        },
        countryId: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    },
    {
        modelName: 'Company',
        tableName: 'tbl_companies',
        timestamps: true,
        indexes: [
            { fields: ['status'] },
        ],
    }
);

export default Company;
