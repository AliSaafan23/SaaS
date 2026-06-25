import {
    Category,
    Unit,
    Product,
    Customer,
    Supplier,
} from '../../../models/index.js';
import inventoryReturnObject from '../inventory/inventoryReturnObject.js';
import customerReturnObject from '../customers/customerReturnObject.js';
import supplierReturnObject from '../suppliers/supplierReturnObject.js';
import { OFFLINE_DTO_VERSION } from '../../../config/offlineLicense.js';

export const buildLicenseBootstrapPayload = async ({ companyId, branchId }) => {
    const catalogWhere = { companyId, branchId };

    const [categories, units, products, customers, suppliers] = await Promise.all([
        Category.findAll({ where: catalogWhere, order: [['name', 'ASC']] }),
        Unit.findAll({ where: catalogWhere, order: [['name', 'ASC']] }),
        Product.findAll({
            where: catalogWhere,
            include: [
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Unit, as: 'baseUnit', attributes: ['id', 'name'] },
            ],
            order: [['name', 'ASC']],
        }),
        Customer.findAll({ where: catalogWhere, order: [['name', 'ASC']] }),
        Supplier.findAll({ where: catalogWhere, order: [['name', 'ASC']] }),
    ]);

    return {
        dtoVersion: OFFLINE_DTO_VERSION,
        generatedAt: new Date().toISOString(),
        companyId,
        branchId,
        categories: categories.map((item) => inventoryReturnObject.category(item)),
        units: units.map((item) => inventoryReturnObject.unit(item)),
        products: products.map((item) => inventoryReturnObject.product(item)),
        customers: customers.map((item) => customerReturnObject.customer(item)),
        suppliers: suppliers.map((item) => supplierReturnObject.supplier(item)),
    };
};

export default { buildLicenseBootstrapPayload };
