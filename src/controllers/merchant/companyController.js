import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { Op } from 'sequelize';
import {
    Company,
    Branch,
    Cashier,
    CompanySubscription,
    SubscriptionPlan,
} from '../../models/index.js';
import { lang } from './shared.js';

const profile = async (req, res) => {
    const merchant = req.merchant;
    const company = await Company.findByPk(merchant.companyId, {
        include: [
            {
                model: CompanySubscription,
                as: 'subscriptions',
                include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }],
            },
        ],
    });

    const branchCount = await Branch.count({
        where: { companyId: merchant.companyId, status: { [Op.ne]: 'inactive' } },
    });
    const cashierCount = await Cashier.count({
        include: [{ model: Branch, as: 'branch', where: { companyId: merchant.companyId }, required: true }],
    });

    const activeSub = company?.subscriptions?.find((s) => s.status === 'active');

    res.send(
        new ApiResponse('success', i18n.__('profileFetched'), 200, {
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
            phone: merchant.phone,
            language: merchant.language,
            company: company
                ? {
                      id: company.id,
                      name: company.name,
                      phone: company.phone,
                      address: company.address,
                      logo: company.logo,
                      status: company.status,
                  }
                : null,
            subscription: activeSub
                ? {
                      id: activeSub.id,
                      status: activeSub.status,
                      startsAt: activeSub.startsAt,
                      expiresAt: activeSub.expiresAt,
                      plan: activeSub.subscriptionPlan
                          ? {
                                id: activeSub.subscriptionPlan.id,
                                name: activeSub.subscriptionPlan.getLocalizedName?.(lang(req)),
                                maxBranches: activeSub.subscriptionPlan.maxBranches,
                                maxDevices: activeSub.subscriptionPlan.maxDevices,
                                maxProducts: activeSub.subscriptionPlan.maxProducts,
                            }
                          : null,
                  }
                : null,
            stats: {
                branchCount,
                cashierCount,
                maxBranches: activeSub?.subscriptionPlan?.maxBranches || 0,
                maxDevices: activeSub?.subscriptionPlan?.maxDevices || 0,
            },
        })
    );
};

export default {
    profile,
};
