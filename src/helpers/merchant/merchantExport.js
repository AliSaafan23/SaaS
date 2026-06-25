import ExcelJS from 'exceljs';
import merchantMetrics from './merchantMetrics.js';

export const buildBranchesSummaryExcel = async (companyId, fromStr, toStr, lang = 'ar') => {
    const rows = await merchantMetrics.getBranchesSummary(companyId, fromStr, toStr);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(lang === 'en' ? 'Branches' : 'الفروع');

    const headers =
        lang === 'en'
            ? ['Branch', 'Address', 'Sales', 'Profit', 'Invoices', 'Cashiers', 'Status']
            : ['الفرع', 'العنوان', 'المبيعات', 'الربح', 'الفواتير', 'الكاشيرز', 'الحالة'];

    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };

    rows.forEach((b) => {
        ws.addRow([
            b.name,
            b.address || '',
            Number(b.revenue || 0),
            Number(b.profit || 0),
            Number(b.invoices || 0),
            Number(b.cashierCount || 0),
            b.status || '',
        ]);
    });

    ws.columns.forEach((col) => {
        col.width = 18;
    });

    return wb;
};

export default { buildBranchesSummaryExcel };
