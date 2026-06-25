import ExcelJS from 'exceljs';
import { Product } from '../../../models/index.js';
import {
    requireCatalogTenant,
    resolveScopedCategoryId,
    resolveScopedUnitId,
    CatalogScopeError,
} from './catalogScope.js';
import { generateBarcode } from './productService.js';
import { getDefaultImportMapping } from './productExcelColumns.js';

const parseDecimal = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const parseOptionalText = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
};

const parseExpiryDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const resolveColumnIndex = (mappingValue, headers) => {
    const key = String(mappingValue || '').trim();
    if (!key) return null;

    if (/^[A-Z]+$/i.test(key)) {
        let index = 0;
        const upper = key.toUpperCase();
        for (let i = 0; i < upper.length; i += 1) {
            index = index * 26 + (upper.charCodeAt(i) - 64);
        }
        return index - 1;
    }

    const headerIndex = headers.findIndex(
        (h) => String(h || '').trim().toLowerCase() === key.toLowerCase()
    );
    return headerIndex >= 0 ? headerIndex : null;
};

const getCellValue = (row, columnIndex) => {
    if (columnIndex === null || columnIndex === undefined) return null;
    const cell = row.getCell(columnIndex + 1);
    const value = cell?.value;
    if (value && typeof value === 'object' && value.text) return value.text;
    if (value instanceof Date) return value;
    return value;
};

const resolveImportColumns = (mapping = {}, headers = []) => {
    const effectiveMapping = { ...getDefaultImportMapping(), ...mapping };
    return {
        name: resolveColumnIndex(effectiveMapping.name, headers),
        barcode: resolveColumnIndex(effectiveMapping.barcode, headers),
        description: resolveColumnIndex(effectiveMapping.description, headers),
        category_id: resolveColumnIndex(effectiveMapping.category_id, headers),
        base_unit_id: resolveColumnIndex(effectiveMapping.base_unit_id, headers),
        cost_price: resolveColumnIndex(effectiveMapping.cost_price, headers),
        sale_price_1: resolveColumnIndex(
            effectiveMapping.sale_price_1 || effectiveMapping.sale_price,
            headers
        ),
        sale_price_2: resolveColumnIndex(effectiveMapping.sale_price_2, headers),
        sale_price_3: resolveColumnIndex(effectiveMapping.sale_price_3, headers),
        quantity: resolveColumnIndex(effectiveMapping.quantity, headers),
        reorder_level: resolveColumnIndex(effectiveMapping.reorder_level, headers),
        tax_percent: resolveColumnIndex(effectiveMapping.tax_percent, headers),
        expiry_date: resolveColumnIndex(effectiveMapping.expiry_date, headers),
        units_count: resolveColumnIndex(effectiveMapping.units_count, headers),
    };
};

const buildProductPayload = async (req, row, columns) => {
    const name = getCellValue(row, columns.name);
    if (!name || !String(name).trim()) return null;

    const barcodeRaw =
        columns.barcode !== null ? getCellValue(row, columns.barcode) : null;
    const barcode = barcodeRaw ? String(barcodeRaw).trim() : generateBarcode();

    const category_id = await resolveScopedCategoryId(
        req,
        getCellValue(row, columns.category_id)
    );
    const base_unit_id = await resolveScopedUnitId(
        req,
        getCellValue(row, columns.base_unit_id)
    );

    const sale_price_1 = parseDecimal(getCellValue(row, columns.sale_price_1));
    const sale_price_2Raw = getCellValue(row, columns.sale_price_2);
    const sale_price_3Raw = getCellValue(row, columns.sale_price_3);

    return {
        barcode,
        name: String(name).trim(),
        description: parseOptionalText(getCellValue(row, columns.description)),
        category_id,
        base_unit_id,
        cost_price: parseDecimal(getCellValue(row, columns.cost_price)),
        sale_price_1,
        sale_price_2:
            sale_price_2Raw === null || sale_price_2Raw === ''
                ? sale_price_1
                : parseDecimal(sale_price_2Raw),
        sale_price_3:
            sale_price_3Raw === null || sale_price_3Raw === ''
                ? sale_price_1
                : parseDecimal(sale_price_3Raw),
        quantity: parseDecimal(getCellValue(row, columns.quantity)),
        reorder_level: parseDecimal(getCellValue(row, columns.reorder_level)),
        tax_percent: parseDecimal(getCellValue(row, columns.tax_percent)),
        expiry_date: parseExpiryDate(getCellValue(row, columns.expiry_date)),
        units_count: parseDecimal(getCellValue(row, columns.units_count), 1) || 1,
    };
};

/**
 * Import products from Excel buffer.
 * Uses official template column order when mapping is omitted.
 */
export const importProductsFromExcel = async (req, fileBuffer, mapping = {}) => {
    const { companyId, branchId } = await requireCatalogTenant(req);

    if (!fileBuffer?.length) {
        throw new CatalogScopeError('excelFileRequired');
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new CatalogScopeError('excelSheetEmpty');

    const headerRow = ws.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = cell.value != null ? String(cell.value).trim() : '';
    });

    const columns = resolveImportColumns(mapping, headers);

    if (columns.name === null) {
        throw new CatalogScopeError('excelMappingNameRequired');
    }

    const result = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (let rowNumber = 2; rowNumber <= ws.rowCount; rowNumber += 1) {
        const row = ws.getRow(rowNumber);
        try {
            const payload = await buildProductPayload(req, row, columns);
            if (!payload) {
                result.skipped += 1;
                continue;
            }

            const existing = await Product.findOne({
                where: { companyId, branchId, barcode: payload.barcode },
            });

            if (existing) {
                await existing.update(payload);
                result.updated += 1;
            } else {
                await Product.create({
                    ...payload,
                    companyId,
                    branchId,
                    status: 'active',
                });
                result.imported += 1;
            }
        } catch (err) {
            result.errors.push({
                row: rowNumber,
                message: err instanceof CatalogScopeError ? err.code : err.message,
            });
            result.skipped += 1;
        }
    }

    return result;
};

export default { importProductsFromExcel };
