import i18n from 'i18n';
import { matchedData } from 'express-validator';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import { CompanySubscription, SubscriptionPlan } from '../../models/index.js';
import { requestCompanySubscription, confirmSubscriptionPayment } from '../../helpers/dashboard/subscriptionService.js';
import { normalizePlanPlatform } from '../../helpers/dashboard/subscriptionPlanFeatures.js';
import returnObject from '../../helpers/dashboard/returnobject.js';
import * as paymob from '../../services/paymob/paymob.js';
import { lang } from './shared.js';
import {
    getCompanyPendingPayment,
    uploadSubscriptionReceipt,
    formatMerchantPendingPayment,
} from '../../helpers/merchant/subscriptionPaymentService.js';

const getPlans = async (req, res) => {
    const l = lang(req);
    const where = { isActive: true };
    const platform = normalizePlanPlatform(req.query.platform);
    if (platform) where.platform = platform;
    if (req.query.deploymentTier) {
        where.deploymentTier = String(req.query.deploymentTier).toLowerCase() === 'offline' ? 'offline' : 'online';
    }

    const plans = await SubscriptionPlan.findAll({
        where,
        order: [['price', 'ASC']],
    });

    const data = plans.map((p) => ({
        id: p.id,
        name: p.getLocalizedName?.(l),
        description: p.getLocalizedDescription?.(l),
        platform: p.platform,
        deploymentTier: p.deploymentTier || 'online',
        billingCycle: p.billingCycle,
        price: p.price,
        durationDays: p.durationDays,
        maxBranches: p.maxBranches,
        maxDevices: p.maxDevices,
        maxProducts: p.maxProducts,
        features: p.features || [],
    }));

    res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
};

const subscribe = async (req, res) => {
    const merchant = req.merchant;
    const { subscriptionPlanId } = matchedData(req);

    try {
        const { subscription, payment, plan } = await requestCompanySubscription({
            companyId: merchant.companyId,
            subscriptionPlanId,
        });

        res.send(
            new ApiResponse('success', i18n.__('subscriptionRequested'), 201, {
                subscription: {
                    id: subscription.id,
                    companyId: subscription.companyId,
                    status: subscription.status,
                    platform: subscription.platform,
                },
                payment: returnObject.subscriptionPayment(payment, lang(req)),
                plan: {
                    id: plan.id,
                    name: plan.getLocalizedName?.(lang(req)),
                    price: plan.price,
                    maxBranches: plan.maxBranches,
                    maxDevices: plan.maxDevices,
                },
                message: i18n.__('completePaymentToActivate'),
            })
        );
    } catch (e) {
        if (e.message === 'companyNotFound') return errorHandler(res, 'notFound', 'companyNotFound');
        if (e.message === 'invalidPlan') return errorHandler(res, 'fail', 'invalidPlan');
        if (e.message === 'alreadySubscribed') return errorHandler(res, 'fail', 'alreadySubscribed');
        throw e;
    }
};

const subscriptionStatus = async (req, res) => {
    const merchant = req.merchant;

    const subs = await CompanySubscription.findAll({
        where: { companyId: merchant.companyId },
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
    });

    const l = lang(req);
    const data = subs.map((s) => ({
        id: s.id,
        platform: s.platform,
        status: s.status,
        startsAt: s.startsAt,
        expiresAt: s.expiresAt,
        activatedAt: s.activatedAt,
        plan: s.subscriptionPlan
            ? {
                  id: s.subscriptionPlan.id,
                  name: s.subscriptionPlan.getLocalizedName?.(l),
                  price: s.subscriptionPlan.price,
                  maxBranches: s.subscriptionPlan.maxBranches,
                  maxDevices: s.subscriptionPlan.maxDevices,
              }
            : null,
    }));

    res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, data));
};

const getPendingPayment = async (req, res) => {
    const merchant = req.merchant;
    const payment = await getCompanyPendingPayment(merchant.companyId);
    const l = lang(req);

    res.send(
        new ApiResponse('success', i18n.__('dataFetched'), 200, {
            pendingPayment: formatMerchantPendingPayment(payment, l),
        })
    );
};

const uploadPaymentReceipt = async (req, res) => {
    const merchant = req.merchant;

    try {
        const payment = await uploadSubscriptionReceipt({
            companyId: merchant.companyId,
            req,
        });

        res.send(
            new ApiResponse('success', i18n.__('receiptUploaded'), 200, {
                pendingPayment: formatMerchantPendingPayment(payment, lang(req)),
            })
        );
    } catch (e) {
        if (e.message === 'noPendingPayment') return errorHandler(res, 'fail', 'noPendingPayment');
        if (e.message === 'receiptImageRequired') return errorHandler(res, 'fail', 'receiptImageRequired');
        if (e.message === 'receiptUploadFailed') return errorHandler(res, 'fail', 'receiptUploadFailed');
        throw e;
    }
};

const paymobWebhook = async (req, res) => {
    const hmac = req.query.hmac;
    const body = req.body;

    if (!hmac || !paymob.verifyHMAC(body, hmac)) {
        return res.status(400).json({ success: false });
    }

    const obj = body?.obj;
    if (!obj?.success) {
        return res.json({ success: true });
    }

    const merchantOrderId =
        obj.order?.merchant_order_id ||
        obj.merchant_order_id ||
        obj.special_reference;

    if (!merchantOrderId) {
        return res.json({ success: true });
    }

    try {
        await confirmSubscriptionPayment({
            merchantOrderId,
            gatewayTransactionId: String(obj.id || ''),
            gatewayOrderId: String(obj.order?.id || ''),
        });
    } catch (e) {
        if (e.message !== 'paymentNotFound') console.error('Paymob webhook:', e);
    }

    return res.json({ success: true });
};

export default {
    getPlans,
    subscribe,
    subscriptionStatus,
    getPendingPayment,
    uploadPaymentReceipt,
    paymobWebhook,
};
