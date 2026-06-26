import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV) process.env.NODE_ENV = process.env.NODE_ENV.trim();

const dialect = process.env.DB_DIALECT || 'postgres';
const isPostgres = dialect === 'postgres';
const useSsl = process.env.DATABASE_SSL !== 'false' && isPostgres;

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
          dialect: 'postgres',
          logging: process.env.NODE_ENV === 'development' ? console.log : false,
          dialectOptions: useSsl
              ? { ssl: { require: true, rejectUnauthorized: false } }
              : {},
          pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
          define: { timestamps: true, underscored: false },
      })
    : new Sequelize(
          process.env.DB_NAME || 'saas_subscription',
          process.env.DB_USER || 'postgres',
          process.env.DB_PASSWORD ?? '',
          {
              host: process.env.DB_HOST || 'localhost',
              port: parseInt(process.env.DB_PORT, 10) || 5432,
              dialect,
              logging: process.env.NODE_ENV === 'development' ? console.log : false,
              dialectOptions: useSsl
                  ? { ssl: { require: true, rejectUnauthorized: false } }
                  : {},
              pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
              define: { timestamps: true, underscored: false },
          }
      );

export { sequelize };
export default sequelize;
