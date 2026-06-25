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

const INVOICE_DIR = 'sale-invoices';

const PDF_OPTIONS = {
    format: 'A4',
    orientation: 'portrait',
    border: '6mm',
};

const formatAmount = (value) => Number(value || 0).toFixed(2);

const formatInvoiceDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toISOString().slice(0, 10);
};

const invoiceLabels = {
    ar: {
        title: 'فاتورة مبيعات',
        invoiceNo: 'رقم الفاتورة',
        date: 'التاريخ',
        customer: 'العميل',
        phone: 'الهاتف',
        walkIn: 'عميل نقدي',
        product: 'المنتج',
        qty: 'الكمية',
        price: 'السعر',
        discount: 'الخصم',
        tax: 'الضريبة',
        lineTotal: 'الإجمالي',
        subtotal: 'المجموع الفرعي',
        itemDiscount: 'خصم الأصناف',
        invoiceDiscount: 'خصم الفاتورة',
        taxAmount: 'الضريبة',
        grandTotal: 'الإجمالي',
        paid: 'المدفوع',
        due: 'المتبقي',
        paymentMethod: 'طريقة الدفع',
        status: 'الحالة',
        notes: 'ملاحظات',
        none: '—',
        settled: 'مسددة',
        unpaid: 'غير مسددة',
        partial: 'تسديد جزئي',
    },
    en: {
        title: 'Sales Invoice',
        invoiceNo: 'Invoice #',
        date: 'Date',
        customer: 'Customer',
        phone: 'Phone',
        walkIn: 'Walk-in customer',
        product: 'Product',
        qty: 'Qty',
        price: 'Price',
        discount: 'Discount',
        tax: 'Tax',
        lineTotal: 'Total',
        subtotal: 'Subtotal',
        itemDiscount: 'Item discount',
        invoiceDiscount: 'Invoice discount',
        taxAmount: 'Tax',
        grandTotal: 'Grand total',
        paid: 'Paid',
        due: 'Due',
        paymentMethod: 'Payment method',
        status: 'Status',
        notes: 'Notes',
        none: '—',
        settled: 'Settled',
        unpaid: 'Unpaid',
        partial: 'Partially paid',
    },
};

const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Tahoma, sans-serif;
    direction: rtl;
    margin: 0;
    padding: 12px;
    color: #222;
    font-size: 12px;
  }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #1e88e5; padding-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; color: #1e88e5; margin: 4px 0; }
  .company { font-size: 13px; color: #444; }
  .meta-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    margin: 12px 0;
    font-size: 12px;
  }
  .meta-box { min-width: 45%; }
  .meta-label { color: #666; font-size: 11px; }
  .meta-value { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ccc; padding: 7px 5px; text-align: center; }
  th { background: #e8f4fc; font-weight: bold; }
  .totals { margin-top: 12px; width: 100%; max-width: 320px; margin-right: auto; margin-left: 0; }
  .totals td { border: none; padding: 4px 8px; text-align: right; }
  .totals .label { color: #555; }
  .totals .grand td { font-size: 14px; font-weight: bold; color: #1e88e5; border-top: 2px solid #1e88e5; padding-top: 8px; }
  .notes { margin-top: 14px; padding: 8px; background: #f8f8f8; border-radius: 4px; font-size: 11px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
  .badge-cancelled { background: #ffebee; color: #c62828; }
  .badge-completed { background: #e8f5e9; color: #2e7d32; }
`;

const INVOICE_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><style>${baseStyles}</style></head>
<body>
  <div class="header">
    <div class="title">{{labels.title}}</div>
    <div class="company">{{meta.companyName}}{{#if meta.branchName}} — {{meta.branchName}}{{/if}}</div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">{{labels.invoiceNo}}</div>
      <div class="meta-value">#{{invoice.invoice_no}}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">{{labels.date}}</div>
      <div class="meta-value">{{invoice.invoice_date}}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">{{labels.customer}}</div>
      <div class="meta-value">{{invoice.customer_name}}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">{{labels.phone}}</div>
      <div class="meta-value">{{invoice.customer_phone}}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">{{labels.paymentMethod}}</div>
      <div class="meta-value">{{invoice.payment_method_label}}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">{{labels.status}}</div>
      <div class="meta-value">{{invoice.status_label}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>{{labels.product}}</th>
        <th>{{labels.qty}}</th>
        <th>{{labels.price}}</th>
        <th>{{labels.discount}}</th>
        <th>{{labels.tax}}</th>
        <th>{{labels.lineTotal}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{index}}</td>
        <td style="text-align:right">{{name}}</td>
        <td>{{qty}}</td>
        <td>{{price}}</td>
        <td>{{discount}}</td>
        <td>{{tax}}</td>
        <td>{{total}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <table class="totals">
    <tr><td class="label">{{labels.subtotal}}</td><td>{{invoice.subtotal}}</td></tr>
    <tr><td class="label">{{labels.itemDiscount}}</td><td>{{invoice.item_discount}}</td></tr>
    <tr><td class="label">{{labels.invoiceDiscount}}</td><td>{{invoice.invoice_discount}}</td></tr>
    <tr><td class="label">{{labels.taxAmount}}</td><td>{{invoice.tax_amount}}</td></tr>
    <tr class="grand"><td class="label">{{labels.grandTotal}}</td><td>{{invoice.total}}</td></tr>
    <tr><td class="label">{{labels.paid}}</td><td>{{invoice.paid_amount}}</td></tr>
    <tr><td class="label">{{labels.due}}</td><td>{{invoice.due_amount}} ({{invoice.payment_status_label}})</td></tr>
  </table>

  {{#if invoice.notes}}
  <div class="notes"><strong>{{labels.notes}}:</strong> {{invoice.notes}}</div>
  {{/if}}
</body>
</html>`;

const getInvoicesDir = () => {
    makeDir(INVOICE_DIR);
    return path.join(__dirname, '..', '..', '..', '..', 'public', 'assets', 'uploads', INVOICE_DIR);
};

const buildPdfFile = async ({ html, data, prefix, invoiceNo }) => {
    const safeNo = String(invoiceNo || 'invoice').replace(/[^\w-]+/g, '_');
    const fileName = `${prefix}-${safeNo}-${Date.now()}.pdf`;
    const filePath = path.join(getInvoicesDir(), fileName);

    await pdf.create({ html, data, path: filePath }, PDF_OPTIONS);

    if (!fs.existsSync(filePath)) {
        throw new Error('pdfGenerationFailed');
    }

    const basePath = sharedVariable.saleInvoices || '/assets/uploads/sale-invoices/';
    return {
        fileName,
        filePath,
        fileUrl: `${sharedVariable.address}${basePath}${fileName}`,
    };
};

const paymentStatusLabel = (sale, labels) => {
    const due = Number(sale.due_amount) || 0;
    const paid = Number(sale.paid_amount) || 0;
    if (due <= 0) return labels.settled;
    if (paid > 0) return labels.partial;
    return labels.unpaid;
};

export const buildWhatsAppShareUrl = (pdfUrl, sale, lang = 'ar') => {
    const labels = invoiceLabels[lang] || invoiceLabels.ar;
    const customerName = sale.customer?.name || labels.walkIn;
    const lines = [
        labels.title,
        `${labels.invoiceNo}: #${sale.invoice_no}`,
        `${labels.date}: ${formatInvoiceDate(sale.invoice_date)}`,
        `${labels.customer}: ${customerName}`,
        `${labels.grandTotal}: ${formatAmount(sale.total)}`,
        `${labels.paid}: ${formatAmount(sale.paid_amount)}`,
        `${labels.due}: ${formatAmount(sale.due_amount)}`,
        pdfUrl,
    ].filter(Boolean);

    return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
};

export const generateSaleInvoicePdf = async (req, sale, lang = 'ar') => {
    const labels = invoiceLabels[lang] || invoiceLabels.ar;
    const meta = await getReportMeta(req);

    const items = (sale.items || []).map((item, index) => ({
        index: index + 1,
        name: item.product?.displayName || item.product?.name || `#${item.product_id}`,
        qty: formatAmount(item.qty),
        price: formatAmount(item.price),
        discount: formatAmount(item.discount),
        tax: formatAmount(item.tax),
        total: formatAmount(item.total),
    }));

    const invoice = {
        invoice_no: sale.invoice_no,
        invoice_date: formatInvoiceDate(sale.invoice_date),
        customer_name: sale.customer?.name || labels.walkIn,
        customer_phone: sale.customer?.phone || labels.none,
        payment_method_label: sale.payment_method_label || labels.none,
        status_label: sale.status_label || sale.status,
        subtotal: formatAmount(sale.subtotal),
        item_discount: formatAmount(sale.item_discount),
        invoice_discount: formatAmount(sale.invoice_discount),
        tax_amount: formatAmount(sale.tax_amount),
        total: formatAmount(sale.total),
        paid_amount: formatAmount(sale.paid_amount),
        due_amount: formatAmount(sale.due_amount),
        payment_status_label: paymentStatusLabel(sale, labels),
        notes: sale.notes || '',
    };

    return buildPdfFile({
        html: INVOICE_HTML,
        prefix: 'invoice',
        invoiceNo: sale.invoice_no,
        data: { labels, meta, invoice, items },
    });
};

/** PDF file + share links for print / view / WhatsApp. */
export const buildSaleInvoiceDocuments = async (req, sale, lang = 'ar') => {
    const pdf = await generateSaleInvoicePdf(req, sale, lang);

    return {
        pdf,
        share: {
            whatsappUrl: buildWhatsAppShareUrl(pdf.fileUrl, sale, lang),
            viewUrl: pdf.fileUrl,
            printUrl: pdf.fileUrl,
            pdfDownloadUrl: pdf.fileUrl,
        },
    };
};

export default {
    generateSaleInvoicePdf,
    buildWhatsAppShareUrl,
    buildSaleInvoiceDocuments,
};
