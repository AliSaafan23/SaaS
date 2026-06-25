import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';

const TICKET_STATUS = ['open', 'in_progress', 'resolved', 'closed'];
const TICKET_PRIORITY = ['low', 'medium', 'high', 'urgent'];

const SupportTicket = sequelize.define(
    'SupportTicket',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        cashierId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'tbl_cashiers', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        subject: { type: DataTypes.STRING(255), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.ENUM(...TICKET_STATUS), allowNull: false, defaultValue: 'open' },
        priority: { type: DataTypes.ENUM(...TICKET_PRIORITY), allowNull: false, defaultValue: 'medium' },
        createdByAdminId: { type: DataTypes.BIGINT, allowNull: true },
        assignedToAdminId: { type: DataTypes.BIGINT, allowNull: true },
        reply: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'tbl_support_tickets' }
);

export default SupportTicket;
