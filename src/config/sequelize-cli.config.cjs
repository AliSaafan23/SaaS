require('dotenv').config();

const base = {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    timezone: '+02:00',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

module.exports = {
    development: { ...base },
    test: { ...base },
    production: { ...base },
};
