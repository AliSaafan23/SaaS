import { Op } from 'sequelize';
import { SubscriptionPayment, SubscriptionPlan } from '../../models/index.js';
import { sharedVariable } from '../../config/index.js';
import makeDir from '../../utils/common/makeDir.js';
import uploadFiles from '../../utils/common/uploadFiles.js';
import deleteFiles from '../../utils/common/deleteFiles.js';

const RECEIPT_FIELD = 'receipt';

export const buildReceiptImageUrl = (filename) => {
    if (!filename) return null;
    return `${sharedVariable.address}${sharedVariable.subscriptionReceipts}${filename}`;
};

export const getCompanyPendingPayment = async (companyId) => {
    return SubscriptionPayment.findOne({
        where: { companyId, status: 'pending' },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
        order: [['id', 'DESC']],
    });
};

export const uploadSubscriptionReceipt = async ({ companyId, req }) => {
    const payment = await getCompanyPendingPayment(companyId);

    if (!payment) {
        const err = new Error('noPendingPayment');
        throw err;
    }

    if (!req.files?.[RECEIPT_FIELD]) {
        const err = new Error('receiptImageRequired');
        throw err;
    }

    makeDir('subscription-receipts');

    if (payment.receiptImage) {
        try {
            await deleteFiles.removeFile(payment.receiptImage, 'subscription-receipts');
        } catch (_) {}
    }

    const filename = await uploadFiles.handleUploadAnyImage(req, 'subscription-receipts', RECEIPT_FIELD);

    if (!filename) {
        const err = new Error('receiptUploadFailed');
        throw err;
    }

    const now = new Date();
    await payment.update({
        receiptImage: filename,
        receiptUploadedAt: now,
        notes: payment.notes || '',
    });

    return SubscriptionPayment.findByPk(payment.id, {
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });
};

export const formatMerchantPendingPayment = (payment, lang = 'ar') => {
    if (!payment) return null;

    const plan = payment.subscriptionPlan;

    return {
        id: payment.id,
        companyId: payment.companyId,
        platform: payment.platform,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        merchantOrderId: payment.merchantOrderId,
        receiptImage: payment.receiptImage || null,
        receiptUrl: buildReceiptImageUrl(payment.receiptImage),
        receiptUploadedAt: payment.receiptUploadedAt,
        hasReceipt: Boolean(payment.receiptImage),
        plan: plan
            ? {
                  id: plan.id,
                  name: plan.getLocalizedName?.(lang) || plan.name?.[lang] || plan.name?.ar,
                  price: plan.price,
                  platform: plan.platform,
                  deploymentTier: plan.deploymentTier || 'online',
                  billingCycle: plan.billingCycle,
              }
            : null,
        createdAt: payment.createdAt,
    };
};

export default {
    buildReceiptImageUrl,
    getCompanyPendingPayment,
    uploadSubscriptionReceipt,
    formatMerchantPendingPayment,
    RECEIPT_FIELD,
};
