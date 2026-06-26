import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const JournalEntry = sequelize.define(
    'JournalEntry',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        tenantId: { type: DataTypes.INTEGER, allowNull: false },
        entryDate: { type: DataTypes.DATEONLY, allowNull: false },
        description: { type: DataTypes.STRING(500), allowNull: false },
        referenceType: { type: DataTypes.STRING(50), allowNull: true },
        referenceId: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'tbl_journal_entries' }
);

export default JournalEntry;
