import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sharedVariable } from '../../../config/index.js';
import makeDir from '../../../utils/common/makeDir.js';
import { resolveTenantContext } from '../../../utils/common/tenantIsolation.js';
import { Branch, Company } from '../../../models/index.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-creator-node');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_DIR = 'supplier-reports';

const PDF_OPTIONS = {
    format: 'A4',
    orientation: 'portrait',
    border: '8mm',
};

const formatAmount = (value) => Number(value || 0).toFixed(2);

const reportLabels = {
    ar: {
        payablesTitle: 'التقرير : المتبقي للموردين',
        payablesSubtitle:
            'ملاحظة: الأرقام أدناه تمثل مبالغ مستحقة للموردين (له / على المحل) — أي ما زال المحل مديوناً للمورد. تشمل الرصيد الافتتاحي (له) وفواتير شراء الأجل غير المسددة بعد خصم المدفوعات.',
        withBalancesTitle: 'التقرير : الموردين المتبقي عندهم أرصدة',
        withBalancesSubtitle:
            'ملاحظة: يعرض هذا التقرير الموردين الذين ما زال على المحل مبالغ مستحقة لهم فقط. لا يشمل الموردين الذين عليهم للمحل أو من تم سداد مستحقاتهم بالكامل.',
        date: 'التاريخ',
        time: 'الوقت',
        index: '#',
        name: 'الإسم',
        remainingCredit: 'الباقي من فواتير الأجل (له)',
        remainingOpening: 'الباقي من الرصيد الإفتتاحي (له)',
        total: 'الإجمالي',
        phone: 'رقم الهاتف',
        totalRemaining: 'إجمالي المتبقي عند المورد (له)',
        grandTotal: 'الأجمالي',
        noData: 'لا يوجد موردين بمبالغ متبقية',
    },
    en: {
        payablesTitle: 'Report: Supplier Payables',
        payablesSubtitle:
            'Note: Amounts below are owed by the store to suppliers (payables/credit), not amounts suppliers owe the store. Includes opening credit and unpaid purchase invoices minus payments.',
        withBalancesTitle: 'Report: Suppliers With Remaining Balances',
        withBalancesSubtitle:
            'Note: This report lists only suppliers the store still owes money to. Excludes suppliers who owe the store or are fully paid.',
        date: 'Date',
        time: 'Time',
        index: '#',
        name: 'Name',
        remainingCredit: 'Unpaid credit purchases (owed to supplier)',
        remainingOpening: 'Remaining opening credit (owed to supplier)',
        total: 'Total',
        phone: 'Phone',
        totalRemaining: 'Total owed to supplier',
        grandTotal: 'Grand total',
        noData: 'No suppliers with remaining balances',
    },
};

const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Tahoma, sans-serif;
    direction: rtl;
    margin: 0;
    padding: 16px;
    color: #222;
    font-size: 12px;
  }
  .header { text-align: center; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: bold; margin: 8px 0; }
  .subtitle {
    font-size: 11px;
    color: #444;
    background: #fff8e6;
    border: 1px solid #f0d080;
    border-radius: 4px;
    padding: 8px 12px;
    margin: 10px 0 14px;
    line-height: 1.6;
    text-align: right;
  }
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 8px 6px; text-align: center; }
  th { background: #e8f4fc; font-weight: bold; }
  .total-row td { background: #f3f3f3; color: #c00; font-weight: bold; }
  .empty { text-align: center; padding: 24px; color: #666; }
`;

const PAYABLES_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><style>${baseStyles}</style></head>
<body>
  <div class="header">
    <div class="title">{{labels.payablesTitle}}</div>
    <div>{{meta.companyName}}{{#if meta.branchName}} — {{meta.branchName}}{{/if}}</div>
  </div>
  <div class="subtitle">{{labels.payablesSubtitle}}</div>
  <div class="meta">
    <div>{{labels.date}}: {{meta.date}}</div>
    <div>{{labels.time}}: {{meta.time}}</div>
  </div>
  {{#if items.length}}
  <table>
    <thead>
      <tr>
        <th>{{labels.index}}</th>
        <th>{{labels.name}}</th>
        <th>{{labels.remainingCredit}}</th>
        <th>{{labels.remainingOpening}}</th>
        <th>{{labels.total}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.index}}</td>
        <td>{{this.name}}</td>
        <td>{{this.remaining_credit_invoices}}</td>
        <td>{{this.remaining_opening_balance}}</td>
        <td>{{this.total}}</td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td colspan="2">{{labels.grandTotal}}</td>
        <td>{{totals.remaining_credit_invoices}}</td>
        <td>{{totals.remaining_opening_balance}}</td>
        <td>{{totals.total}}</td>
      </tr>
    </tbody>
  </table>
  {{else}}
  <div class="empty">{{labels.noData}}</div>
  {{/if}}
</body>
</html>`;

const WITH_BALANCES_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><style>${baseStyles}</style></head>
<body>
  <div class="header">
    <div class="title">{{labels.withBalancesTitle}}</div>
    <div>{{meta.companyName}}{{#if meta.branchName}} — {{meta.branchName}}{{/if}}</div>
  </div>
  <div class="subtitle">{{labels.withBalancesSubtitle}}</div>
  <div class="meta">
    <div>{{labels.date}}: {{meta.date}}</div>
    <div>{{labels.time}}: {{meta.time}}</div>
  </div>
  {{#if items.length}}
  <table>
    <thead>
      <tr>
        <th>{{labels.index}}</th>
        <th>{{labels.name}}</th>
        <th>{{labels.phone}}</th>
        <th>{{labels.totalRemaining}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.index}}</td>
        <td>{{this.name}}</td>
        <td>{{this.phone}}</td>
        <td>{{this.total_remaining}}</td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td colspan="3">{{labels.grandTotal}}</td>
        <td>{{totals.total_remaining}}</td>
      </tr>
    </tbody>
  </table>
  {{else}}
  <div class="empty">{{labels.noData}}</div>
  {{/if}}
</body>
</html>`;

const getReportsDir = () => {
    makeDir(REPORT_DIR);
    return path.join(__dirname, '..', '..', '..', '..', 'public', 'assets', 'uploads', REPORT_DIR);
};

export const getReportMeta = async (req) => {
    const { companyId, branchId } = await resolveTenantContext(req);
    const [branch, company] = await Promise.all([
        branchId ? Branch.findByPk(branchId, { attributes: ['name'] }) : null,
        companyId ? Company.findByPk(companyId, { attributes: ['name'] }) : null,
    ]);
    const now = new Date();
    return {
        companyName: company?.name || 'MnsPos',
        branchName: branch?.name || '',
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
    };
};

const buildPdfFile = async ({ html, data, prefix }) => {
    const fileName = `${prefix}-${Date.now()}.pdf`;
    const filePath = path.join(getReportsDir(), fileName);

    await pdf.create({ html, data, path: filePath }, PDF_OPTIONS);

    if (!fs.existsSync(filePath)) {
        throw new Error('pdfGenerationFailed');
    }

    return {
        fileName,
        filePath,
        fileUrl: `${sharedVariable.address}${sharedVariable.supplierReports}${fileName}`,
    };
};

export const generatePayablesPdf = async (req, { items, totals }, lang = 'ar') => {
    const labels = reportLabels[lang] || reportLabels.ar;
    const meta = await getReportMeta(req);

    const rows = items.map((item, index) => ({
        index: index + 1,
        name: item.name,
        remaining_credit_invoices: formatAmount(item.remaining_credit_invoices),
        remaining_opening_balance: formatAmount(item.remaining_opening_balance),
        total: formatAmount(item.total),
    }));

    return buildPdfFile({
        html: PAYABLES_HTML,
        prefix: 'supplier-payables',
        data: {
            labels,
            meta,
            items: rows,
            totals: {
                remaining_credit_invoices: formatAmount(totals.remaining_credit_invoices),
                remaining_opening_balance: formatAmount(totals.remaining_opening_balance),
                total: formatAmount(totals.total),
            },
        },
    });
};

export const generateWithBalancesPdf = async (req, { items, totals }, lang = 'ar') => {
    const labels = reportLabels[lang] || reportLabels.ar;
    const meta = await getReportMeta(req);

    const rows = items.map((item, index) => ({
        index: index + 1,
        name: item.name,
        phone: item.phone || '—',
        total_remaining: formatAmount(item.total_remaining),
    }));

    return buildPdfFile({
        html: WITH_BALANCES_HTML,
        prefix: 'supplier-with-balances',
        data: {
            labels,
            meta,
            items: rows,
            totals: {
                total_remaining: formatAmount(totals.total_remaining),
            },
        },
    });
};

export default {
    getReportMeta,
    generatePayablesPdf,
    generateWithBalancesPdf,
};
