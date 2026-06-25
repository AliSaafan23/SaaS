import { DataTypes } from 'sequelize';
import bcryptjs from 'bcryptjs';
import persianJs from 'persianjs';
import { sequelize } from '../../config/dbConfig.js';

const MERCHANT_STATUS = ['pending', 'active', 'suspended', 'delete'];
const MERCHANT_LANGUAGE = ['ar', 'en'];

const Merchant = sequelize.define(
    'Merchant',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
        },
        phone: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: '',
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        avatar: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: 'default.jpg',
        },
        language: {
            type: DataTypes.ENUM(...MERCHANT_LANGUAGE),
            allowNull: false,
            defaultValue: 'ar',
        },
        status: {
            type: DataTypes.ENUM(...MERCHANT_STATUS),
            allowNull: false,
            defaultValue: 'pending',
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        activationCode: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        activationCodeExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        resetCode: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        resetCodeExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        companyId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'tbl_companies', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    },
    {
        modelName: 'Merchant',
        tableName: 'tbl_merchants',
        timestamps: true,
        defaultScope: {
            attributes: { exclude: ['password', 'activationCode', 'resetCode'] },
        },
        scopes: {
            withPassword: {
                attributes: {},
            },
        },
        indexes: [
            { fields: ['email'], unique: true },
            { fields: ['phone'] },
            { fields: ['status'] },
            { fields: ['active'] },
            { fields: ['companyId'] },
        ],
    }
);

const normalizeMerchantFields = (merchant) => {
    if (!merchant) return;

    if (merchant.email) {
        merchant.email = merchant.email.trim().toLowerCase();
    }

    if (merchant.phone) {
        merchant.phone = persianJs(merchant.phone).toEnglishNumber().toString();
    }
};

const hashPasswordIfNeeded = async (merchant) => {
    if (merchant.password && !merchant.password.startsWith('$2')) {
        merchant.password = await bcryptjs.hash(merchant.password, 8);
    }
};

Merchant.beforeCreate(async (merchant) => {
    normalizeMerchantFields(merchant);
    await hashPasswordIfNeeded(merchant);
});

Merchant.beforeUpdate(async (merchant) => {
    normalizeMerchantFields(merchant);
    if (merchant.changed('password')) {
        await hashPasswordIfNeeded(merchant);
    }
});

Merchant.prototype.comparePassword = async function (enteredPassword) {
    const merchantWithPassword = await Merchant.scope('withPassword').findByPk(this.id);
    if (!merchantWithPassword?.password) return false;
    return bcryptjs.compare(enteredPassword, merchantWithPassword.password);
};

Merchant.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.activationCode;
    delete values.resetCode;
    return values;
};

export default Merchant;
