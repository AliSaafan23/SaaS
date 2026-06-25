/** Excel columns aligned with POST /products form fields (image excluded). */
export const PRODUCT_IMPORT_COLUMNS = [
    { key: 'name', headerAr: 'اسم المنتج', headerEn: 'Name' },
    { key: 'barcode', headerAr: 'الباركود', headerEn: 'Barcode' },
    { key: 'description', headerAr: 'الوصف', headerEn: 'Description' },
    { key: 'category_id', headerAr: 'التصنيف', headerEn: 'Category' },
    { key: 'base_unit_id', headerAr: 'الوحدة الأساسية', headerEn: 'Base Unit' },
    { key: 'cost_price', headerAr: 'سعر الشراء', headerEn: 'Cost Price' },
    { key: 'sale_price_1', headerAr: 'سعر البيع 1', headerEn: 'Sale Price 1' },
    { key: 'sale_price_2', headerAr: 'سعر البيع 2', headerEn: 'Sale Price 2' },
    { key: 'sale_price_3', headerAr: 'سعر البيع 3', headerEn: 'Sale Price 3' },
    { key: 'quantity', headerAr: 'الكمية', headerEn: 'Quantity' },
    { key: 'reorder_level', headerAr: 'حد إعادة الطلب', headerEn: 'Reorder Level' },
    { key: 'tax_percent', headerAr: 'نسبة الضريبة', headerEn: 'Tax Percent' },
    { key: 'expiry_date', headerAr: 'تاريخ الانتهاء', headerEn: 'Expiry Date' },
    { key: 'units_count', headerAr: 'عدد الوحدات', headerEn: 'Units Count' },
];

const columnLetter = (index) => {
    let letter = '';
    let n = index + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
};

export const getImportTemplateHeaders = (lang = 'ar') =>
    PRODUCT_IMPORT_COLUMNS.map((col) => (lang === 'en' ? col.headerEn : col.headerAr));

/** Letter mapping for the official import template (A=name, B=barcode, ...). */
export const getDefaultImportMapping = () => {
    const mapping = {};
    PRODUCT_IMPORT_COLUMNS.forEach((col, index) => {
        mapping[col.key] = columnLetter(index);
    });
    return mapping;
};

export default {
    PRODUCT_IMPORT_COLUMNS,
    getImportTemplateHeaders,
    getDefaultImportMapping,
};
