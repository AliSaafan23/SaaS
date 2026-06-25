import { DataTypes } from 'sequelize';
import bcryptjs from 'bcryptjs';
import persianJs from 'persianjs';
import { sequelize } from '../../config/dbConfig.js';

const ADMIN_STATUS = ['block', 'active', 'delete'];
const ADMIN_LANGUAGE = ['ar', 'en'];
const ADMIN_THEME = ['light', 'dark'];

const Admin = sequelize.define(
    'Admin',
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
            type: DataTypes.ENUM(...ADMIN_LANGUAGE),
            allowNull: false,
            defaultValue: 'ar',
        },
        userType: {
            type: DataTypes.ENUM('admin'),
            allowNull: false,
            defaultValue: 'admin',
        },
        status: {
            type: DataTypes.ENUM(...ADMIN_STATUS),
            allowNull: false,
            defaultValue: 'active',
        },
        isNotify: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        isAdmin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isHidden: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        canEdit: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        canDelete: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        notifyCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        role_id: {
            type: DataTypes.BIGINT,
            references: {
                model: 'tbl_roles',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            allowNull: true,
        },
        theme: {
            type: DataTypes.ENUM(...ADMIN_THEME),
            allowNull: false,
            defaultValue: 'light',
        },
    },
    {
        modelName: 'Admin',
        tableName: 'tbl_admins',
        timestamps: true,
        defaultScope: {
            attributes: { exclude: ['password'] },
        },
        scopes: {
            withPassword: {
                attributes: {},
            },
        },
        indexes: [
            { fields: ['email'] },
            { fields: ['phone'] },
            { fields: ['status'] },
            { fields: ['role_id'] },
            { fields: ['active'] },
        ],
    }
);

const normalizeAdminFields = (admin) => {
    if (!admin) return;

    if (admin.email) {
        admin.email = admin.email.trim().toLowerCase();
    }

    if (admin.phone) {
        admin.phone = persianJs(admin.phone).toEnglishNumber().toString();
    }
};

const hashPasswordIfNeeded = async (admin) => {
    if (admin.password && !admin.password.startsWith('$2')) {
        admin.password = await bcryptjs.hash(admin.password, 8);
    }
};

Admin.beforeCreate(async (admin) => {
    normalizeAdminFields(admin);
    await hashPasswordIfNeeded(admin);
});

Admin.beforeUpdate(async (admin) => {
    normalizeAdminFields(admin);
    if (admin.changed('password')) {
        await hashPasswordIfNeeded(admin);
    }
});

Admin.prototype.comparePassword = async function (enteredPassword) {
    const adminWithPassword = await Admin.scope('withPassword').findByPk(this.id);
    if (!adminWithPassword?.password) return false;
    return bcryptjs.compare(enteredPassword, adminWithPassword.password);
};

Admin.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
};

export default Admin;
