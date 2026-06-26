import dotenv from 'dotenv';
import { sequelize } from './dbConfig.js';

dotenv.config();

class Database {
    constructor() {
        this.sequelize = sequelize;
    }

    async connect() {
        if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
            throw new Error('Database is not configured. Set DATABASE_URL in .env');
        }

        await this.sequelize.authenticate();
        console.log('✅ Connected to PostgreSQL');

        await import('../models/index.js');
        return this.sequelize;
    }

    async disconnect() {
        if (this.sequelize) {
            await this.sequelize.close();
            console.log('🔌 PostgreSQL disconnected');
        }
    }

    getSequelize() {
        return this.sequelize;
    }
}

const database = new Database();
export default database;
export { database };
