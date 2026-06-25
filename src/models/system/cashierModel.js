import { DataTypes } from 'sequelize';
import bcryptjs from 'bcryptjs';
import persianJs from 'persianjs';
import { sequelize } from '../../config/dbConfig.js';

const CASHIER_STATUS = ['pending', 'block', 'active', 'delete'];
const CASHIER_LANGUAGE = ['ar', 'en'];

const Cashier = sequelize.define(
    'Cashier',
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
            type: DataTypes.ENUM(...CASHIER_LANGUAGE),
            allowNull: false,
            defaultValue: 'ar',
        },
        status: {
            type: DataTypes.ENUM(...CASHIER_STATUS),
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
        branchId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'tbl_branches', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },
    },
    {
        modelName: 'Cashier',
        tableName: 'tbl_cashiers',
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
        ],
    }
);

const normalizeCashierFields = (cashier) => {
    if (!cashier) return;

    if (cashier.email) {
        cashier.email = cashier.email.trim().toLowerCase();
    }

    if (cashier.phone) {
        cashier.phone = persianJs(cashier.phone).toEnglishNumber().toString();
    }
};

const hashPasswordIfNeeded = async (cashier) => {
    if (cashier.password && !cashier.password.startsWith('$2')) {
        cashier.password = await bcryptjs.hash(cashier.password, 8);
    }
};

Cashier.beforeCreate(async (cashier) => {
    normalizeCashierFields(cashier);
    await hashPasswordIfNeeded(cashier);
});

Cashier.beforeUpdate(async (cashier) => {
    normalizeCashierFields(cashier);
    if (cashier.changed('password')) {
        await hashPasswordIfNeeded(cashier);
    }
});

Cashier.prototype.comparePassword = async function (enteredPassword) {
    const cashierWithPassword = await Cashier.scope('withPassword').findByPk(this.id);
    if (!cashierWithPassword?.password) return false;
    return bcryptjs.compare(enteredPassword, cashierWithPassword.password);
};

Cashier.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.activationCode;
    delete values.resetCode;
    return values;
};

export default Cashier;
