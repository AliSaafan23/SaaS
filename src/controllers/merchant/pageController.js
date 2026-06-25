import { Op } from 'sequelize';
import { Branch, CompanySubscription } from '../../models/index.js';

const resolveOnboardingRedirect = async (merchant) => {
    const companyId = merchant.companyId;

    const activeSub = await CompanySubscription.findOne({
        where: { companyId, status: 'active' },
    });
    if (activeSub && (!activeSub.expiresAt || new Date(activeSub.expiresAt) > new Date())) {
        return '/merchant/home';
    }

    const pendingSub = await CompanySubscription.findOne({
        where: { companyId, status: 'pending' },
    });
    if (pendingSub) {
        return '/merchant/payment-pending';
    }

    return null;
};

const renderAuth = (res, view, opts = {}) => {
    res.render(view, {
        layout: 'merchant/layouts/auth',
        ...opts,
    });
};

const renderApp = (res, view, opts = {}) => {
    res.render(view, {
        layout: 'merchant/layouts/app',
        ...opts,
    });
};

export default {
    login: (req, res) => {
        if (req.session?.token) return res.redirect('/merchant/home');
        renderAuth(res, 'merchant/auth/login', {
            pageTitleKey: 'auth.login.title',
            pageScript: '/merchant/js/login.js',
            error: req.query.error || null,
        });
    },

    register: (req, res) => {
        if (req.session?.token) return res.redirect('/merchant/home');
        renderAuth(res, 'merchant/auth/register', {
            pageTitleKey: 'auth.register.title',
            pageScript: '/merchant/js/register.js',
        });
    },

    verifyEmail: (req, res) => {
        renderAuth(res, 'merchant/auth/verify-email', {
            pageTitleKey: 'auth.verify.title',
            pageScript: '/merchant/js/verify-email.js',
            email: req.query.email || '',
            resent: req.query.resent === '1',
        });
    },

    forgotPassword: (req, res) => {
        renderAuth(res, 'merchant/auth/forgot-password', {
            pageTitleKey: 'auth.forgot.title',
            pageScript: '/merchant/js/forgot-password.js',
        });
    },

    resetPassword: (req, res) => {
        renderAuth(res, 'merchant/auth/reset-password', {
            pageTitleKey: 'auth.reset.title',
            pageScript: '/merchant/js/reset-password.js',
            email: req.query.email || '',
        });
    },

    plans: async (req, res) => {
        const redirect = await resolveOnboardingRedirect(req.merchant);
        if (redirect) return res.redirect(redirect);

        renderApp(res, 'merchant/onboarding/plans', {
            pageTitleKey: 'nav.plans',
            page: 'plans',
            merchant: req.merchant,
            company: req.company,
        });
    },

    paymentPending: async (req, res) => {
        const companyId = req.merchant.companyId;

        const activeSub = await CompanySubscription.findOne({
            where: { companyId, status: 'active' },
        });
        if (activeSub && (!activeSub.expiresAt || new Date(activeSub.expiresAt) > new Date())) {
            return res.redirect('/merchant/home');
        }

        const pendingSub = await CompanySubscription.findOne({
            where: { companyId, status: 'pending' },
        });
        if (!pendingSub) {
            return res.redirect('/merchant/plans');
        }

        renderApp(res, 'merchant/onboarding/payment-pending', {
            pageTitleKey: 'nav.paymentPending',
            page: 'payment-pending',
            merchant: req.merchant,
            company: req.company,
        });
    },

    home: async (req, res) => {
        const branches = await Branch.findAll({
            where: { companyId: req.merchant.companyId, status: { [Op.ne]: 'inactive' } },
            attributes: ['id', 'name', 'address', 'status'],
            order: [['name', 'ASC']],
        });

        renderApp(res, 'merchant/app/home', {
            pageTitleKey: 'nav.home',
            page: 'home',
            merchant: req.merchant,
            company: req.company,
            branches,
        });
    },

    branches: (req, res) => {
        renderApp(res, 'merchant/app/branches/index', {
            pageTitleKey: 'nav.branches',
            page: 'branches',
            merchant: req.merchant,
            company: req.company,
        });
    },

    branchDetail: async (req, res) => {
        const branch = await Branch.findOne({
            where: {
                id: req.params.id,
                companyId: req.merchant.companyId,
                status: { [Op.ne]: 'inactive' },
            },
            attributes: ['id', 'name', 'address', 'phone', 'status'],
        });
        if (!branch) {
            return res.redirect('/merchant/ui/branches');
        }

        renderApp(res, 'merchant/app/branches/show', {
            pageTitleKey: 'branchDetail.title',
            page: 'branches',
            merchant: req.merchant,
            company: req.company,
            branch,
            branchId: branch.id,
        });
    },

    cashiers: (req, res) => {
        renderApp(res, 'merchant/app/cashiers/index', {
            pageTitleKey: 'nav.cashiers',
            page: 'cashiers',
            merchant: req.merchant,
            company: req.company,
        });
    },

    saleReturns: async (req, res) => {
        const branches = await Branch.findAll({
            where: { companyId: req.merchant.companyId, status: { [Op.ne]: 'inactive' } },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']],
        });

        renderApp(res, 'merchant/app/sale-returns/index', {
            pageTitleKey: 'nav.saleReturns',
            page: 'sale-returns',
            merchant: req.merchant,
            company: req.company,
            branches,
        });
    },

    profile: (req, res) => {
        renderApp(res, 'merchant/app/profile', {
            pageTitleKey: 'nav.profile',
            page: 'profile',
            merchant: req.merchant,
            company: req.company,
        });
    },

    subscription: (req, res) => {
        renderApp(res, 'merchant/app/subscription', {
            pageTitleKey: 'nav.subscription',
            page: 'subscription',
            merchant: req.merchant,
            company: req.company,
        });
    },
};
