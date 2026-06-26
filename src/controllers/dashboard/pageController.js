export default {
    login: (req, res) => {
        if (req.session?.token) return res.redirect('/dashboard/home');
        res.render('admin/auth/login', { layout: false, pageTitleKey: 'pages.login', error: req.query.error || null });
    },

    register: (req, res) => {
        if (req.session?.token) return res.redirect('/dashboard/home');
        res.render('admin/auth/register', { layout: false, pageTitleKey: 'pages.register' });
    },

    home: (req, res) =>
        res.render('admin/index/index', { pageTitleKey: 'pages.home', page: 'home', user: req.tenantUser }),

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
};
