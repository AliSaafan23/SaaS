import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV) process.env.NODE_ENV = process.env.NODE_ENV.trim();

const {
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DB_DIALECT,
} = process.env;

if (!DB_NAME || !DB_USER) {
    console.warn(
        '⚠️  DB_NAME or DB_USER not set — Sequelize models will fail until .env is configured'
    );
}

const sequelize = new Sequelize(DB_NAME || 'pos_steel', DB_USER || 'root', DB_PASSWORD ?? '', {
    host: DB_HOST || 'localhost',
    port: parseInt(DB_PORT, 10) || 3306,
    dialect: DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    define: {
        timestamps: true,
        underscored: false,
    },
    timezone: '+02:00',
});

export { sequelize };
export default sequelize;
