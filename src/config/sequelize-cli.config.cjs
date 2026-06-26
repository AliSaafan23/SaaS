require('dotenv').config();

const useUrl = Boolean(process.env.DATABASE_URL);

const base = useUrl
    ? {
          url: process.env.DATABASE_URL,
          dialect: 'postgres',
          dialectOptions: {
              ssl: process.env.DATABASE_SSL === 'false' ? false : { require: true, rejectUnauthorized: false },
          },
      }
    : {
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'saas_subscription',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT, 10) || 5432,
          dialect: process.env.DB_DIALECT || 'postgres',
      };

module.exports = {
    development: { ...base, logging: console.log },
    test: { ...base, logging: false },
    production: { ...base, logging: false },
};
