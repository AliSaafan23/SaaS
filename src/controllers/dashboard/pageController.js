import { Customer, Subscription, Invoice, Plan, Payment } from '../../models/index.js';
import { getRevenueChartData } from '../../helpers/dashboard/revenueChart.js';
import { getReportsDashboard } from '../../helpers/accounting/reportsService.js';

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
        const locale = req.getLocale?.() === 'ar' ? 'ar-EG' : 'en-US';

        const [dashboard, chart, planCount, subscriptionCount, recentInvoices, recentPayments] =
            await Promise.all([
                getReportsDashboard({ tenantId, locale, months: 6 }),
                getRevenueChartData(tenantId, { granularity: 'monthly', locale }),
                Plan.count({ where: { tenantId } }),
                Subscription.count({ where: { tenantId, status: 'active' } }),
                Invoice.findAll({
                    where: { tenantId },
                    include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
                    order: [['issueDate', 'DESC'], ['id', 'DESC']],
                    limit: 10,
                }),
                Payment.findAll({
                    where: { tenantId },
                    include: [
                        {
                            model: Invoice,
                            as: 'invoice',
                            attributes: ['id'],
                            include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
                        },
                    ],
                    order: [['paymentDate', 'DESC'], ['id', 'DESC']],
                    limit: 10,
                }),
            ]);

        const k = dashboard.kpis;
        const activity = [
            ...recentPayments.map((p) => ({
                type: 'payment',
                customer: p.invoice?.customer?.name || '—',
                amount: Number(p.amount || 0),
                date: p.paymentDate,
                ref: `PAY-${p.id}`,
            })),
            ...recentInvoices.map((inv) => ({
                type: inv.status === 'paid' ? 'payment' : 'invoice',
                customer: inv.customer?.name || '—',
                amount: Number(inv.amount || 0),
                date: inv.issueDate,
                ref: `INV-${inv.id}`,
            })),
        ]
            .sort((a, b) => {
                const da = new Date(a.date).getTime() || 0;
                const db = new Date(b.date).getTime() || 0;
                return db - da;
            })
            .slice(0, 8);

        res.render('admin/index/index', {
            pageTitleKey: 'pages.home',
            page: 'home',
            user: req.tenantUser,
            stats: {
                customers: k.customersCount || 0,
                subscriptions: subscriptionCount || 0,
                plans: planCount || 0,
                openInvoices: k.openInvoicesCount || 0,
                paidInvoices: k.paidInvoicesCount || 0,
                revenue: k.totalCollected || 0,
                recognizedRevenue: k.recognizedRevenue || 0,
                totalInvoiced: k.totalInvoiced || 0,
                outstanding: k.outstanding || 0,
                cash: k.cash || 0,
                accountsReceivable: k.accountsReceivable || 0,
                deferredRevenue: k.deferredRevenue || 0,
                collectionRate: k.collectionRate || 0,
                debtorsCount: k.debtorsCount || 0,
            },
            chart,
            trend: dashboard.trend,
            debtors: (dashboard.debtors || []).slice(0, 5),
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
