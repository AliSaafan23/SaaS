import { Customer, Subscription, Invoice, Plan } from '../../models/index.js';

export default {
    login: (req, res) => {
        if (req.session?.token) return res.redirect('/dashboard/home');
        res.render('admin/auth/login', { layout: false, pageTitleKey: 'pages.login', error: req.query.error || null });
    },

    register: (req, res) => {
        if (req.session?.token) return res.redirect('/dashboard/home');
        res.render('admin/auth/register', { layout: false, pageTitleKey: 'pages.register' });
    },

    verifyEmail: (req, res) => {
        if (req.session?.token) return res.redirect('/dashboard/home');
        res.render('admin/auth/verify-email', {
            layout: false,
            pageTitleKey: 'pages.verifyEmail',
            email: req.query.email || '',
        });
    },

    home: async (req, res) => {
        const tenantId = req.tenantId;
        const [customerCount, subscriptionCount, activePlans, totalRevenue] = await Promise.all([
            Customer.count({ where: { tenantId } }),
            Subscription.count({ where: { tenantId, status: 'active' } }),
            Plan.count({ where: { tenantId, isActive: true } }),
            Invoice.sum('amount', { where: { tenantId, status: 'paid' } }),
        ]);

        res.render('admin/index/index', {
            pageTitleKey: 'pages.home',
            page: 'home',
            user: req.tenantUser,
            stats: {
                customers: customerCount || 0,
                subscriptions: subscriptionCount || 0,
                plans: activePlans || 0,
                revenue: totalRevenue || 0,
            },
        });
    },

    plans: (req, res) =>
        res.render('admin/plans/index', { pageTitleKey: 'pages.plans', page: 'plans', user: req.tenantUser }),

    customers: (req, res) =>
        res.render('admin/customers/index', { pageTitleKey: 'pages.customers', page: 'customers', user: req.tenantUser }),

    subscriptions: (req, res) =>
        res.render('admin/subscriptions/index', {
            pageTitleKey: 'pages.subscriptions',
            page: 'subscriptions',
            user: req.tenantUser,
        }),

    invoices: (req, res) =>
        res.render('admin/invoices/index', {
            pageTitleKey: 'pages.invoices',
            page: 'invoices',
            user: req.tenantUser,
        }),

    payments: (req, res) =>
        res.render('admin/payments/index', {
            pageTitleKey: 'pages.payments',
            page: 'payments',
            user: req.tenantUser,
        }),

    reports: (req, res) =>
        res.render('admin/reports/index', { pageTitleKey: 'pages.reports', page: 'reports', user: req.tenantUser }),

    users: (req, res) =>
        res.render('admin/users/index', { pageTitleKey: 'pages.users', page: 'users', user: req.tenantUser }),

    roles: (req, res) =>
        res.render('admin/roles/index', { pageTitleKey: 'pages.roles', page: 'roles', user: req.tenantUser }),
};
