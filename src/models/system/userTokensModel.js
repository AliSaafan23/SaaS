import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const TOKEN_USER_REF = ['Admin', 'Cashier', 'Personal', 'Driver', 'Merchant'];

const UserToken = sequelize.define(
    'UserToken',
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        userRef: {
            type: DataTypes.ENUM(...TOKEN_USER_REF),
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        deviceId: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        platform: {
            type: DataTypes.ENUM('desktop', 'mobile'),
            allowNull: true,
        },
        expired: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Token expiry — 30 days from creation',
        },
    },
    {
        modelName: 'UserToken',
        tableName: 'tbl_user_tokens',
        timestamps: true,
        indexes: [
            { fields: ['userId', 'userRef'] },
            { fields: ['token'] },
            { fields: ['expired'] },
            { fields: ['expiresAt'] },
        ],
    }
);

UserToken.beforeCreate((userToken) => {
    if (!userToken.expiresAt) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        userToken.expiresAt = expiresAt;
    }
});

export default UserToken;
