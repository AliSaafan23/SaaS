import i18n from 'i18n';
import { Op } from 'sequelize';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import { logAudit } from '../../helpers/dashboard/auditLog.js';
import { SupportTicket, Cashier } from '../../models/index.js';

export default {
    list: async (req, res) => {
        const tickets = await SupportTicket.findAll({
            include: [{ model: Cashier, as: 'cashier', attributes: ['id', 'name', 'email'] }],
            order: [['id', 'DESC']],
        });
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, tickets));
    },

    updateStatus: async (req, res) => {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return errorHandler(res, 'notFound', 'ticketNotFound');

        const { status, reply } = req.body;
        await ticket.update({ status, reply: reply || ticket.reply });
        await logAudit(req, { action: 'ticket.updated', module: 'support', metadata: { ticketId: ticket.id } });
        res.send(new ApiResponse('success', i18n.__('ticketUpdated'), 200, ticket));
    },
};
