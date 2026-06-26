import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const JournalLine = sequelize.define(
    'JournalLine',
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        journalEntryId: { type: DataTypes.INTEGER, allowNull: false },
        accountId: { type: DataTypes.INTEGER, allowNull: false },
        debit: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
        credit: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
    },
    { tableName: 'tbl_journal_lines' }
);

export default JournalLine;
