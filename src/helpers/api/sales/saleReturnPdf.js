import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sharedVariable } from '../../../config/index.js';
import makeDir from '../../../utils/common/makeDir.js';
import { getReportMeta } from '../customers/customerReportPdf.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-creator-node');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RETURN_DIR = 'sale-return-receipts';

const PDF_OPTIONS = {
    format: 'A4',
    orientation: 'portrait',
    border: '6mm',
};

const formatAmount = (value) => Number(value || 0).toFixed(2);

const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toISOString().slice(0, 16).replace('T', ' ');
};

const labels = {
    ar: {
        title: 'إيصال مرتجع بيع',
        returnNo: 'رقم المرتجع',
        invoiceNo: 'فاتورة البيع',
        date: 'التاريخ',
        customer: 'العميل',
        walkIn: 'عميل نقدي',
        product: 'المنتج',
        qty: 'الكمية',
        price: 'السعر',
        discount: 'الخصم',
        tax: 'الضريبة',
        lineTotal: 'الإجمالي',
        grandTotal: 'إجمالي المرتجع',
        notes: 'ملاحظات',
        none: '—',
    },
    en: {
        title: 'Sale Return Receipt',
        returnNo: 'Return #',
        invoiceNo: 'Sale invoice',
        date: 'Date',
        customer: 'Customer',
        walkIn: 'Walk-in customer',
        product: 'Product',
        qty: 'Qty',
        price: 'Price',
        discount: 'Discount',
        tax: 'Tax',
        lineTotal: 'Total',
        grandTotal: 'Return total',
        notes: 'Notes',
        none: '—',
    },
};

const baseStyles = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Tahoma, sans-serif; direction: rtl; margin: 0; padding: 12px; color: #222; font-size: 12px; }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #c62828; padding-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; color: #c62828; margin: 4px 0; }
  .company { font-size: 13px; color: #444; }
  .meta-grid { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin: 12px 0; }
  .meta-box { min-width: 45%; }
  .meta-label { color: #666; font-size: 11px; }
  .meta-value { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ccc; padding: 7px 5px; text-align: center; }
  th { background: #ffebee; font-weight: bold; }
  .totals { margin-top: 12px; width: 100%; max-width: 280px; margin-right: auto; }
  .totals td { border: none; padding: 4px 8px; text-align: right; }
  .totals .grand td { font-size: 14px; font-weight: bold; color: #c62828; border-top: 2px solid #c62828; padding-top: 8px; }
  .notes { margin-top: 14px; padding: 8px; background: #f8f8f8; border-radius: 4px; font-size: 11px; }
`;

const RETURN_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><style>${baseStyles}</style></head>
<body>
  <div class="header">
    <div class="title">{{labels.title}}</div>
    <div class="company">{{meta.companyName}}{{#if meta.branchName}} — {{meta.branchName}}{{/if}}</div>
  </div>
  <div class="meta-grid">
    <div class="meta-box"><div class="meta-label">{{labels.returnNo}}</div><div class="meta-value">{{doc.return_no}}</div></div>
    <div class="meta-box"><div class="meta-label">{{labels.invoiceNo}}</div><div class="meta-value">#{{doc.invoice_no}}</div></div>
    <div class="meta-box"><div class="meta-label">{{labels.date}}</div><div class="meta-value">{{doc.return_date}}</div></div>
    <div class="meta-box"><div class="meta-label">{{labels.customer}}</div><div class="meta-value">{{doc.customer_name}}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>{{labels.product}}</th><th>{{labels.qty}}</th><th>{{labels.price}}</th><th>{{labels.discount}}</th><th>{{labels.tax}}</th><th>{{labels.lineTotal}}</th></tr></thead>
    <tbody>
      {{#each items}}
      <tr><td>{{index}}</td><td style="text-align:right">{{name}}</td><td>{{qty}}</td><td>{{price}}</td><td>{{discount}}</td><td>{{tax}}</td><td>{{total}}</td></tr>
      {{/each}}
    </tbody>
  </table>
  <table class="totals"><tr class="grand"><td class="label">{{labels.grandTotal}}</td><td>{{doc.total}}</td></tr></table>
  {{#if doc.notes}}<div class="notes"><strong>{{labels.notes}}:</strong> {{doc.notes}}</div>{{/if}}
</body>
</html>`;

const getReturnsDir = () => {
    makeDir(RETURN_DIR);
    return path.join(__dirname, '..', '..', '..', '..', 'public', 'assets', 'uploads', RETURN_DIR);
};

const buildPdfFile = async ({ data, returnNo }) => {
    const safeNo = String(returnNo || 'return').replace(/[^\w-]+/g, '_');
    const fileName = `return-${safeNo}-${Date.now()}.pdf`;
    const filePath = path.join(getReturnsDir(), fileName);

    await pdf.create({ html: RETURN_HTML, data, path: filePath }, PDF_OPTIONS);

    if (!fs.existsSync(filePath)) throw new Error('pdfGenerationFailed');

    const basePath = sharedVariable.saleReturnReceipts || '/assets/uploads/sale-return-receipts/';
    return {
        fileName,
        filePath,
        fileUrl: `${sharedVariable.address}${basePath}${fileName}`,
    };
};

export const buildSaleReturnDocuments = async (req, saleReturnDto, lang = 'ar') => {
    const L = labels[lang] || labels.ar;
    const meta = await getReportMeta(req);

    const items = (saleReturnDto.items || []).map((item, index) => ({
        index: index + 1,
        name: item.product?.displayName || item.product?.name || `#${item.product_id}`,
        qty: formatAmount(item.qty),
        price: formatAmount(item.price),
        discount: formatAmount(item.discount),
        tax: formatAmount(item.tax),
        total: formatAmount(item.total),
    }));

    const doc = {
        return_no: saleReturnDto.return_no,
        invoice_no: saleReturnDto.sale?.invoice_no || saleReturnDto.invoice_no || '—',
        return_date: formatDate(saleReturnDto.createdAt),
        customer_name: saleReturnDto.customer?.name || L.walkIn,
        total: formatAmount(saleReturnDto.total),
        notes: saleReturnDto.notes || '',
    };

    const pdf = await buildPdfFile({ data: { labels: L, meta, doc, items }, returnNo: doc.return_no });

    return {
        pdf,
        share: {
            viewUrl: pdf.fileUrl,
            printUrl: pdf.fileUrl,
            pdfDownloadUrl: pdf.fileUrl,
        },
    };
};

export default { buildSaleReturnDocuments };
