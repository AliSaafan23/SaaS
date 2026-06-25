import dotenv from 'dotenv';
import { sequelize } from './dbConfig.js';

dotenv.config();
if (process.env.NODE_ENV) process.env.NODE_ENV = process.env.NODE_ENV.trim();

class Database {
    constructor() {
        this.sequelize = sequelize;
    }

    async connect() {
        const { DB_NAME, DB_USER, DB_HOST, DB_PORT } = process.env;

        if (!DB_NAME || !DB_USER) {
            throw new Error(
                'MySQL credentials are not defined. Set DB_NAME and DB_USER in .env'
            );
        }

        await this.sequelize.authenticate();
        console.log(
            `✅ Connected to MySQL => ${DB_NAME}@${DB_HOST || 'localhost'}:${DB_PORT || 3306}`
        );

        // Load all Sequelize models + associations
        await import('../models/index.js');

        return this.sequelize;
    }

    async disconnect() {
        if (this.sequelize) {
            await this.sequelize.close();
            console.log('🔌 MySQL disconnected');
        }
    }

    getSequelize() {
        return this.sequelize;
    }

    getConnection() {
        return this.sequelize;
    }
}

const database = new Database();

export default database;
export { database };
