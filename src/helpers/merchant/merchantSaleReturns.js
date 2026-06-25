import { Op } from 'sequelize';
import { SaleReturn } from '../../models/index.js';
import { parseDateRange } from '../dashboard/dateRange.js';
import { resolveBranchFilter, getActiveBranchIds } from './branchScope.js';
import { roundMoney } from '../api/sales/saleCalculations.js';

export const listCompanySaleReturns = async (
    companyId,
    { branchId: branchIdRaw, from, to, page = 1, limit = 50 } = {}
) => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from: dateFrom, to: dateTo } = parseDateRange(from, to, { days: 30, maxDays: 366 });

    const where = {
        branchId: branchId ? branchId : { [Op.in]: branchIds },
        createdAt: { [Op.between]: [dateFrom, dateTo] },
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * pageLimit;

    const { rows, count } = await SaleReturn.findAndCountAll({
        where,
        include: [
            {
                association: 'sale',
                attributes: ['id', 'invoice_no'],
                required: true,
            },
            {
                association: 'customer',
                attributes: ['id', 'name'],
                required: false,
            },
            {
                association: 'items',
                include: [
                    {
                        association: 'product',
                        attributes: ['id', 'name', 'barcode'],
                        required: false,
                    },
                ],
            },
            {
                association: 'branch',
                attributes: ['id', 'name'],
                required: false,
            },
        ],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit: pageLimit,
        offset,
        distinct: true,
    });

    const totalAmount = roundMoney(
        rows.reduce((sum, row) => sum + Number(row.total), 0)
    );

    return {
        items: rows.map((row) => ({
            id: row.id,
            return_no: row.return_no,
            sale_id: row.sale_id,
            invoice_no: row.sale?.invoice_no,
            branch: row.branch ? { id: row.branch.id, name: row.branch.name } : null,
            customer: row.customer ? { id: row.customer.id, name: row.customer.name } : null,
            total: Number(row.total),
            notes: row.notes,
            items: (row.items || []).map((item) => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product?.name,
                qty: Number(item.qty),
                total: Number(item.total),
            })),
            createdAt: row.createdAt,
        })),
        summary: { count, totalAmount },
        pagination: {
            page: pageNum,
            limit: pageLimit,
            total: count,
            pages: Math.ceil(count / pageLimit) || 1,
        },
        period: { from: dateFrom, to: dateTo },
        branchId,
    };
};

export default { listCompanySaleReturns };
