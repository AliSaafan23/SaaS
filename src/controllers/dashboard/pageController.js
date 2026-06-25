export default {
    login: (req, res) => {
        if (req.session?.token) return res.redirect('/dashboard/home');
        res.render('admin/auth/login', { layout: false, pageTitleKey: 'pages.login', error: req.query.error || null });
    },
    home: (req, res) => res.render('admin/index/index', { pageTitleKey: 'pages.home', page: 'home', user: req.admin }),
    subscribers: (req, res) => res.render('admin/subscribers/index', { pageTitleKey: 'pages.subscribers', page: 'subscribers', user: req.admin }),
    subscriptions: (req, res) => res.render('admin/subscriptions/index', { pageTitleKey: 'pages.subscriptions', page: 'subscriptions', user: req.admin }),
    admins: (req, res) => res.render('admin/admins/index', { pageTitleKey: 'pages.admins', page: 'admins', user: req.admin }),
    roles: (req, res) => res.render('admin/roles/index', { pageTitleKey: 'pages.roles', page: 'roles', user: req.admin }),
    sales: (req, res) => res.render('admin/sales/index', { pageTitleKey: 'pages.sales', page: 'sales', user: req.admin }),
    inventory: (req, res) => res.render('admin/inventory/index', { pageTitleKey: 'pages.inventory', page: 'inventory', user: req.admin }),
    support: (req, res) => res.render('admin/support/index', { pageTitleKey: 'pages.support', page: 'support', user: req.admin }),
    notifications: (req, res) => res.render('admin/notifications/index', { pageTitleKey: 'pages.notifications', page: 'notifications', user: req.admin }),
    audit: (req, res) => res.render('admin/audit/index', { pageTitleKey: 'pages.audit', page: 'audit', user: req.admin }),
    reports: (req, res) => res.render('admin/reports/index', { pageTitleKey: 'pages.reports', page: 'reports', user: req.admin }),
    settings: (req, res) => res.render('admin/settings/index', { pageTitleKey: 'pages.settings', page: 'settings', user: req.admin }),
    countries: (req, res) => res.render('admin/countries/index', { pageTitleKey: 'pages.countries', page: 'countries', user: req.admin }),
    appInstalls: (req, res) => res.render('admin/app-installs/index', { pageTitleKey: 'pages.appInstalls', page: 'app-installs', user: req.admin }),
};
