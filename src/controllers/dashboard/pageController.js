import { Customer, Subscription, Invoice, Plan } from '../../models/index.js';
import { getRevenueChartData } from '../../helpers/dashboard/revenueChart.js';

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
        const [customerCount, subscriptionCount, planCount, openInvoices, totalRevenue, recentInvoices] = await Promise.all([
            Customer.count({ where: { tenantId } }),
            Subscription.count({ where: { tenantId, status: 'active' } }),
            Plan.count({ where: { tenantId } }),
            Invoice.count({ where: { tenantId, status: 'open' } }),
            Invoice.sum('amount', { where: { tenantId, status: 'paid' } }),
            Invoice.findAll({
                where: { tenantId },
                include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
                order: [['issueDate', 'DESC'], ['id', 'DESC']],
                limit: 6,
            }),
        ]);

        const locale = req.getLocale?.() === 'ar' ? 'ar-EG' : 'en-US';
        const chart = await getRevenueChartData(tenantId, { granularity: 'monthly', locale });

        const activity = recentInvoices.map((inv) => ({
            type: inv.status === 'paid' ? 'payment' : 'invoice',
            customer: inv.customer?.name || '—',
            amount: Number(inv.amount || 0),
            date: inv.issueDate,
        }));

        res.render('admin/index/index', {
            pageTitleKey: 'pages.home',
            page: 'home',
            user: req.tenantUser,
            stats: {
                customers: customerCount || 0,
                subscriptions: subscriptionCount || 0,
                plans: planCount || 0,
                openInvoices: openInvoices || 0,
                revenue: Number(totalRevenue || 0),
            },
            chart,
            activity,
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

    profile: (req, res) =>
        res.render('admin/profile/index', { pageTitleKey: 'profile.title', page: 'profile', user: req.tenantUser }),
};
