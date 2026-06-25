import database from './database.js';

// Re-export config modules
export { default as database } from './database.js';
export { default as sharedVariable } from './sharedVariable.js';

// Sequelize instance (available after database.connect())
export const getSequelize = () => database.getSequelize();
