import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const UserToken = sequelize.define(
    'UserToken',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        userRef: { type: DataTypes.STRING(50), allowNull: false },
        token: { type: DataTypes.TEXT, allowNull: false },
        expired: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'tbl_user_tokens' }
);

export default UserToken;
