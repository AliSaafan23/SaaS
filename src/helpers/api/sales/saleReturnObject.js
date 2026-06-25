import { parseDecimal, splitOpeningBalance } from '../customers/customerBalance.js';

const paymentMethodLabels = {
    cash: { ar: 'نقداً', en: 'Cash' },
    card: { ar: 'بطاقة', en: 'Card' },
    credit: { ar: 'آجل', en: 'Credit' },
    cheque: { ar: 'شيك', en: 'Cheque' },
    mixed: { ar: 'مختلط', en: 'Mixed' },
};

const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    completed: { ar: 'مكتملة', en: 'Completed' },
    cancelled: { ar: 'ملغاة', en: 'Cancelled' },
};

const label = (map, key, locale = 'ar') => map[key]?.[locale] || map[key]?.ar || key;

const productLine = (product) => {
    if (!product) return null;
    const unit = product.baseUnit || product.base_unit;
    const unitName = unit?.name ? `[${unit.name}]` : '';
    return {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        displayName: `${product.name}${unitName ? ` ${unitName}` : ''}`.trim(),
    };
};

const saleItem = (item, returnedQtyMap = null) => {
    const soldQty = Number(item.qty);
    const returnedQty =
        returnedQtyMap && item.id != null ? Number(returnedQtyMap[item.id] || 0) : null;

    return {
        id: item.id,
        product_id: item.product_id,
        product: productLine(item.product),
        qty: soldQty,
        sold_qty: soldQty,
        returned_qty: returnedQty,
        net_qty: returnedQty != null ? Math.max(0, soldQty - returnedQty) : undefined,
        price: Number(item.price),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.total),
    };
};

const paymentMethodBrief = (method, locale = 'ar') => {
    if (!method) return null;
    return {
        id: method.id,
        code: method.code,
        name: method.getLocalizedName ? method.getLocalizedName(locale) : method.nameAr,
        affectsCashbox: Boolean(method.affectsCashbox),
        requiresCustomer: Boolean(method.requiresCustomer),
    };
};

const salePayment = (payment, locale = 'ar') => ({
    id: payment.id,
    payment_method_id: payment.payment_method_id,
    payment_method: payment.payment_method,
    payment_method_label: payment.paymentMethod
        ? payment.paymentMethod.getLocalizedName(locale)
        : label(paymentMethodLabels, payment.payment_method, locale),
    paymentMethod: paymentMethodBrief(payment.paymentMethod, locale),
    amount: Number(payment.amount),
    is_zero: Number(payment.amount) <= 0,
});

const computeFullyReturned = (sale, returnedQtyMap) => {
    const items = sale.items || [];
    if (!items.length || !returnedQtyMap) return false;
    return items.every((item) => {
        const sold = Number(item.qty);
        if (sold <= 0) return true;
        return Number(returnedQtyMap[item.id] || 0) >= sold;
    });
};

const customerBrief = (customer, locale = 'ar') => {
    if (!customer) return null;
    const opening = splitOpeningBalance(customer.opening_balance);
    return {
        id: customer.id,
        customer_code: customer.customer_code,
        name: customer.name,
        phone: customer.phone,
        price_level: Number(customer.price_level),
        opening_credit: opening.opening_credit,
        opening_debit: opening.opening_debit,
        price_level_label: customer.price_level_label || null,
    };
};

const saleBase = (sale, locale = 'ar') => ({
    id: sale.id,
    invoice_no: sale.invoice_no,
    invoice_date: sale.invoice_date,
    sale_price_type: Number(sale.sale_price_type ?? 1),
    customer_id: sale.customer_id,
    customer: customerBrief(sale.customer, locale),
    subtotal: Number(sale.subtotal),
    item_discount: Number(sale.item_discount),
    invoice_discount: Number(sale.invoice_discount),
    discount_percent: Number(sale.discount_percent),
    tax_amount: Number(sale.tax_amount),
    total: Number(sale.total),
    paid_amount: Number(sale.paid_amount),
    due_amount: Number(sale.due_amount),
    payment_method: sale.payment_method,
    payment_method_id: sale.payment_method_id,
    payment_method_label: sale.paymentMethod
        ? sale.paymentMethod.getLocalizedName(locale)
        : label(paymentMethodLabels, sale.payment_method, locale),
    paymentMethod: paymentMethodBrief(sale.paymentMethod, locale),
    notes: sale.notes,
    status: sale.status,
    status_label: label(statusLabels, sale.status, locale),
    branchId: sale.branchId,
    cashierId: sale.cashierId,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
});

const returnObject = {
    meta: ({ nextInvoiceNo, defaultSalePriceType, branchId }) => ({
        nextInvoiceNo,
        defaultSalePriceType,
        branchId,
        defaultInvoiceDate: new Date().toISOString().slice(0, 10),
    }),

    returnMeta: ({ nextReturnNo, branchId }) => ({
        nextReturnNo,
        branchId,
    }),

    customerReceivable: (customer, balances) => ({
        customer: customerBrief(customer),
        remaining_opening_balance: balances.remaining_opening_balance,
        remaining_credit_invoices: balances.remaining_credit_invoices,
        total: balances.total,
        /** Positive = عليه (owes store), negative = له (store owes) */
        balance_direction:
            balances.total > 0 ? 'debit' : balances.total < 0 ? 'credit' : 'settled',
    }),

    calculate: (totals) => ({
        items: totals.items,
        subtotal: totals.subtotal,
        item_discount: totals.item_discount,
        invoice_discount: totals.invoice_discount,
        discount_percent: totals.discount_percent,
        tax_amount: totals.tax_amount,
        total: totals.total,
        paid_amount: totals.paid_amount,
        due_amount: totals.due_amount,
        preview: totals.preview || {
            products_count: totals.items?.length ?? 0,
            pieces_count: 0,
            total_with_tax: totals.total,
        },
    }),

    sale: (sale, locale = 'ar') => {
        const base = saleBase(sale, locale);
        const returnedQtyMap =
            sale.returnedQtyMap || sale.get?.('returnedQtyMap') || null;
        const returnsSummary =
            sale.returnsSummary || sale.get?.('returnsSummary') || null;

        return {
            ...base,
            returns_summary: returnsSummary,
            fully_returned: computeFullyReturned(sale, returnedQtyMap),
            items: (sale.items || []).map((item) => saleItem(item, returnedQtyMap)),
            payments: (sale.payments || []).map((p) => salePayment(p, locale)),
        };
    },

    saleListItem: (sale, locale = 'ar') => ({
        id: sale.id,
        invoice_no: sale.invoice_no,
        invoice_date: sale.invoice_date,
        customer: sale.customer
            ? { id: sale.customer.id, name: sale.customer.name }
            : null,
        total: Number(sale.total),
        paid_amount: Number(sale.paid_amount),
        due_amount: Number(sale.due_amount),
        payment_method: sale.payment_method,
        payment_method_id: sale.payment_method_id,
        payment_method_label: sale.paymentMethod
            ? sale.paymentMethod.getLocalizedName(locale)
            : label(paymentMethodLabels, sale.payment_method, locale),
        paymentMethod: paymentMethodBrief(sale.paymentMethod, locale),
        status: sale.status,
        status_label: label(statusLabels, sale.status, locale),
        items_count: sale.items?.length ?? sale.get?.('items_count') ?? 0,
    }),

    saleList: (items, pagination, locale = 'ar') => ({
        items: items.map((item) => returnObject.saleListItem(item, locale)),
        pagination,
    }),

    customerPayment: (payment, locale = 'ar') => ({
        id: payment.id,
        customer_id: payment.customer_id,
        amount: Number(payment.amount),
        payment_method: payment.payment_method,
        payment_method_id: payment.payment_method_id,
        paymentMethod: paymentMethodBrief(payment.paymentMethod, locale),
        payment_date: payment.payment_date,
        notes: payment.notes,
        createdAt: payment.createdAt,
    }),

    customerPaymentListItem: (payment, locale = 'ar') => ({
        ...returnObject.customerPayment(payment, locale),
        customer: customerBrief(payment.customer, locale),
    }),

    customerPaymentList: (items, pagination, locale = 'ar') => ({
        items: items.map((item) => returnObject.customerPaymentListItem(item, locale)),
        pagination,
    }),

    saleReturnItem: (item) => ({
        id: item.id,
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        product: productLine(item.product),
        qty: Number(item.qty),
        price: Number(item.price),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.total),
    }),

    saleReturn: (saleReturn, locale = 'ar') => ({
        id: saleReturn.id,
        return_no: saleReturn.return_no,
        sale_id: saleReturn.sale_id,
        sale: saleReturn.sale
            ? {
                  id: saleReturn.sale.id,
                  invoice_no: saleReturn.sale.invoice_no,
                  invoice_date: saleReturn.sale.invoice_date,
                  status: saleReturn.sale.status,
              }
            : null,
        customer_id: saleReturn.customer_id,
        customer: customerBrief(saleReturn.customer, locale),
        total: Number(saleReturn.total),
        notes: saleReturn.notes,
        branchId: saleReturn.branchId,
        cashierId: saleReturn.cashierId,
        items: (saleReturn.items || []).map((item) => returnObject.saleReturnItem(item)),
        createdAt: saleReturn.createdAt,
        updatedAt: saleReturn.updatedAt,
    }),

    saleReturnListItem: (saleReturn, locale = 'ar') => {
        const items = (saleReturn.items || []).map((item) => returnObject.saleReturnItem(item));
        const piecesCount = items.reduce((sum, item) => sum + item.qty, 0);

        return {
            id: saleReturn.id,
            return_no: saleReturn.return_no,
            sale_id: saleReturn.sale_id,
            invoice_no: saleReturn.sale?.invoice_no || null,
            customer: saleReturn.customer
                ? { id: saleReturn.customer.id, name: saleReturn.customer.name }
                : null,
            total: Number(saleReturn.total),
            notes: saleReturn.notes,
            items,
            items_count: items.length,
            pieces_count: piecesCount,
            createdAt: saleReturn.createdAt,
        };
    },

    saleReturnList: (items, pagination, locale = 'ar') => ({
        items: items.map((item) => returnObject.saleReturnListItem(item, locale)),
        pagination,
    }),

    returnable: ({ sale, items, hasReturnable }, locale = 'ar') => ({
        sale: {
            id: sale.id,
            invoice_no: sale.invoice_no,
            status: sale.status,
            total: Number(sale.total),
            paid_amount: Number(sale.paid_amount),
            due_amount: Number(sale.due_amount),
            customer: customerBrief(sale.customer, locale),
        },
        hasReturnable,
        items: items.map((row) => ({
            sale_item_id: row.saleItem.id,
            product_id: row.saleItem.product_id,
            product: productLine(row.saleItem.product),
            sold_qty: row.soldQty,
            returned_qty: row.returnedQty,
            returnable_qty: row.returnableQty,
            unit_price: Number(row.saleItem.price),
            line_total: Number(row.saleItem.total),
        })),
    }),

    returnPreview: (preview, locale = 'ar') => ({
        sale_id: preview.sale.id,
        invoice_no: preview.sale.invoice_no,
        return_total: preview.returnTotal,
        refund: {
            cash_refund: preview.refund.cashRefund,
            credit_refund: preview.refund.creditRefund,
            by_payment_method: (preview.refund.methodRefunds || []).map((row) => ({
                payment_method_id: row.paymentMethodId,
                paymentMethod: paymentMethodBrief(row.method, locale),
                amount: row.amount,
            })),
        },
        updated_sale: {
            total: preview.updatedSale.total,
            paid_amount: preview.updatedSale.paid_amount,
            due_amount: preview.updatedSale.due_amount,
        },
        items: preview.lines.map((line) => ({
            sale_item_id: line.sale_item_id,
            product_id: line.product_id,
            qty: Number(line.qty),
            price: Number(line.price),
            discount: Number(line.discount),
            tax: Number(line.tax),
            total: Number(line.total),
        })),
    }),

    cashboxShiftSummary: (summary, locale = 'ar') => ({
        period: summary.period,
        scope: summary.scope,
        branchId: summary.branchId,
        cashierId: summary.cashierId,
        sales: {
            ...summary.sales,
            byPaymentMethod: (summary.sales.byPaymentMethod || []).map((row) => ({
                paymentMethodId: row.paymentMethodId,
                code: row.code,
                name: locale === 'en' ? row.nameEn || row.nameAr : row.nameAr || row.nameEn,
                affectsCashbox: row.affectsCashbox,
                salesAmount: row.salesAmount,
            })),
        },
        credit: summary.credit,
        drawer: {
            ...summary.drawer,
            openingCash: summary.drawer?.openingCash ?? 0,
            expectedWithOpening: summary.drawer?.expectedWithOpening ?? summary.drawer?.expectedInDrawer ?? 0,
            activeShift: summary.drawer?.activeShift ?? null,
        },
        customerPayments: {
            total: summary.customerPayments.total,
            byPaymentMethod: (summary.customerPayments.byPaymentMethod || []).map((row) => ({
                paymentMethodId: row.paymentMethodId,
                code: row.code,
                name: locale === 'en' ? row.nameEn || row.nameAr : row.nameAr || row.nameEn,
                affectsCashbox: row.affectsCashbox,
                amount: row.amount,
            })),
        },
    }),
};

export { computeFullyReturned };

export default returnObject;
