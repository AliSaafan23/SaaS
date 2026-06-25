import ExcelJS from 'exceljs';
import { Product } from '../../../models/index.js';
import { scopedCatalogWhere } from './catalogScope.js';
import { getImportTemplateHeaders } from './productExcelColumns.js';

const productIncludes = [
    { association: 'category', attributes: ['id', 'name'], required: false },
    { association: 'baseUnit', attributes: ['id', 'name'], required: false },
];

export const buildProductsExportWorkbook = async (req, lang = 'ar') => {
    const where = await scopedCatalogWhere(req, { status: 'active' });
    const products = await Product.findAll({
        where,
        include: productIncludes,
        order: [['name', 'ASC']],
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(lang === 'en' ? 'Products' : 'المنتجات');

    const headers = getImportTemplateHeaders(lang);
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };

    products.forEach((p) => {
        ws.addRow([
            p.name,
            p.barcode,
            p.description || '',
            p.category?.name || '',
            p.baseUnit?.name || '',
            Number(p.cost_price),
            Number(p.sale_price_1),
            Number(p.sale_price_2),
            Number(p.sale_price_3),
            Number(p.quantity),
            Number(p.reorder_level),
            Number(p.tax_percent),
            p.expiry_date || '',
            Number(p.units_count),
        ]);
    });

    ws.columns.forEach((col) => {
        col.width = 18;
    });

    return wb;
};

export const buildImportTemplateWorkbook = (lang = 'ar') => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(lang === 'en' ? 'Import' : 'استيراد');

    const headers = getImportTemplateHeaders(lang);
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };
    ws.columns.forEach((col) => {
        col.width = 20;
    });

    return wb;
};

export default {
    buildProductsExportWorkbook,
    buildImportTemplateWorkbook,
};
