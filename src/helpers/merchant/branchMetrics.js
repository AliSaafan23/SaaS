import { Op, fn, col, literal } from 'sequelize';
import { sequelize } from '../../config/dbConfig.js';
import {
    Branch,
    Cashier,
    Product,
    Sale,
    SaleItem,
    Customer,
    Supplier,
    Purchase,
} from '../../models/index.js';
import { parseDateRange } from '../dashboard/dateRange.js';
import { resolveBranchFilter, branchIdWhere, getActiveBranchIds } from './branchScope.js';

const num = (v) => Number(v || 0);

const buildSaleWhere = (from, to, branchId) => ({
    status: 'completed',
    invoice_date: { [Op.between]: [from, to] },
    branchId,
});

export const getBranchStockLevels = async (companyId, branchId) => {
    const [rows] = await sequelize.query(
        `
        SELECT p.id, p.name, p.barcode, p.reorder_level,
               COALESCE(latest.after_stock, p.quantity) AS quantity
        FROM tbl_products p
        LEFT JOIN (
            SELECT sm1.product_id, sm1.after_stock
            FROM tbl_stock_movements sm1
            INNER JOIN (
                SELECT product_id, MAX(id) AS max_id
                FROM tbl_stock_movements
                WHERE branchId = :branchId
                GROUP BY product_id
            ) x ON sm1.id = x.max_id
        ) latest ON latest.product_id = p.id
        WHERE p.companyId = :companyId AND p.status = 'active'
        ORDER BY p.name ASC
        `,
        { replacements: { companyId, branchId } }
    );

    return rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        barcode: r.barcode,
        quantity: num(r.quantity),
        reorderLevel: num(r.reorder_level),
        isLow: num(r.reorder_level) > 0 && num(r.quantity) <= num(r.reorder_level),
    }));
};

export const getLowStockAlerts = async (companyId, branchIdRaw = null) => {
    const branchId = branchIdRaw ? await resolveBranchFilter(companyId, branchIdRaw) : null;

    if (branchId) {
        const stock = await getBranchStockLevels(companyId, branchId);
        return stock
            .filter((p) => p.isLow)
            .map((p) => ({
                productId: p.id,
                name: p.name,
                barcode: p.barcode,
                quantity: p.quantity,
                reorderLevel: p.reorderLevel,
                branchId,
            }));
    }

    const products = await Product.findAll({
        where: {
            companyId,
            status: 'active',
            reorder_level: { [Op.gt]: 0 },
            [Op.and]: [literal('`Product`.`quantity` <= `Product`.`reorder_level`')],
        },
        attributes: ['id', 'name', 'barcode', 'quantity', 'reorder_level'],
        order: [['name', 'ASC']],
        limit: 50,
    });

    return products.map((p) => ({
        productId: p.id,
        name: p.name,
        barcode: p.barcode,
        quantity: num(p.quantity),
        reorderLevel: num(p.reorder_level),
        branchId: null,
    }));
};

export const getTopProducts = async (companyId, branchIdRaw, fromStr, toStr, limit = 10) => {
    const branchId = branchIdRaw ? await resolveBranchFilter(companyId, branchIdRaw) : null;
    const branchIds = branchId ? [branchId] : await getActiveBranchIds(companyId);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });

    const rows = await SaleItem.findAll({
        attributes: [
            'product_id',
            [fn('SUM', col('SaleItem.qty')), 'qty'],
            [fn('SUM', col('SaleItem.total')), 'revenue'],
        ],
        include: [
            {
                model: Sale,
                as: 'sale',
                attributes: [],
                where: {
                    ...buildSaleWhere(from, to, branchIdWhere(branchIds, branchId)),
                },
                required: true,
            },
            {
                model: Product,
                as: 'product',
                attributes: ['name', 'barcode'],
                required: false,
            },
        ],
        group: ['product_id', 'product.id', 'product.name', 'product.barcode'],
        order: [[literal('qty'), 'DESC']],
        limit,
        raw: true,
        nest: true,
    });

    return rows.map((r) => ({
        productId: r.product_id,
        label: r.product?.name || `#${r.product_id}`,
        barcode: r.product?.barcode || '',
        qty: num(r.qty),
        revenue: num(r.revenue),
    }));
};

export const getBranchOverview = async (companyId, branchIdRaw, fromStr, toStr) => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);
    const { from, to } = parseDateRange(fromStr, toStr, { days: 30, maxDays: 366 });

    const branch = await Branch.findOne({
        where: { id: branchId, companyId },
        attributes: ['id', 'name', 'address', 'phone', 'status'],
    });
    if (!branch) {
        const err = new Error('branchNotFound');
        err.code = 'BRANCH_FORBIDDEN';
        throw err;
    }

    const saleWhere = buildSaleWhere(from, to, branchId);

    const [revenue, invoices, cashierCount, lowStock, topProducts, stockItems] = await Promise.all([
        Sale.sum('total', { where: saleWhere }),
        Sale.count({ where: saleWhere }),
        Cashier.count({ where: { branchId, status: { [Op.ne]: 'delete' } } }),
        getLowStockAlerts(companyId, branchId),
        getTopProducts(companyId, branchId, fromStr, toStr, 5),
        getBranchStockLevels(companyId, branchId),
    ]);

    const profitRows = await SaleItem.findAll({
        attributes: ['total', 'qty'],
        include: [
            { model: Sale, as: 'sale', attributes: [], where: saleWhere, required: true },
            { model: Product, as: 'product', attributes: ['cost_price'], required: false },
        ],
        raw: true,
        nest: true,
    });
    const profit = profitRows.reduce((sum, row) => {
        return sum + (num(row.total) - num(row.qty) * num(row.product?.cost_price));
    }, 0);

    return {
        branch: {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            status: branch.status,
        },
        period: { from, to },
        revenue: num(revenue),
        profit,
        invoices,
        cashierCount,
        productCount: stockItems.length,
        lowStockCount: lowStock.length,
        lowStock,
        topProducts,
    };
};

export const getBranchCustomers = async (companyId, branchIdRaw, limit = 50) => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);

    const saleRows = await Sale.findAll({
        attributes: [[fn('DISTINCT', col('customer_id')), 'customer_id']],
        where: {
            branchId,
            status: 'completed',
            customer_id: { [Op.ne]: null },
        },
        raw: true,
        limit: 200,
    });

    const customerIds = saleRows.map((r) => Number(r.customer_id)).filter(Boolean);
    if (!customerIds.length) return [];

    const rows = await Customer.findAll({
        where: { companyId, id: { [Op.in]: customerIds } },
        attributes: ['id', 'customer_code', 'name', 'phone', 'address'],
        order: [['name', 'ASC']],
        limit,
    });

    return rows.map((c) => ({
        id: c.id,
        code: c.customer_code,
        name: c.name,
        phone: c.phone,
        address: c.address,
    }));
};

export const getBranchSuppliers = async (companyId, branchIdRaw, limit = 50) => {
    const branchId = await resolveBranchFilter(companyId, branchIdRaw);

    const purchaseRows = await Purchase.findAll({
        attributes: [[fn('DISTINCT', col('supplier_id')), 'supplier_id']],
        where: {
            branchId,
            status: 'completed',
            supplier_id: { [Op.ne]: null },
        },
        raw: true,
        limit: 200,
    });

    const supplierIds = purchaseRows.map((r) => Number(r.supplier_id)).filter(Boolean);
    if (!supplierIds.length) return [];

    const rows = await Supplier.findAll({
        where: { companyId, id: { [Op.in]: supplierIds } },
        attributes: ['id', 'supplier_code', 'name', 'phone', 'address'],
        order: [['name', 'ASC']],
        limit,
    });

    return rows.map((s) => ({
        id: s.id,
        code: s.supplier_code,
        name: s.name,
        phone: s.phone,
        address: s.address,
    }));
};

export default {
    getBranchStockLevels,
    getLowStockAlerts,
    getTopProducts,
    getBranchOverview,
    getBranchCustomers,
    getBranchSuppliers,
};
