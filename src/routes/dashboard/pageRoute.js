import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import requireDashboardPage from '../../middleware/auth/requireDashboardPage.js';
import pageController from '../../controllers/dashboard/pageController.js';

const router = express.Router();

router.get('/login', asyncHandler(pageController.login));
router.get('/home', requireDashboardPage, asyncHandler(pageController.home));
router.get('/', requireDashboardPage, (req, res) => res.redirect('/dashboard/home'));

const pages = [
    ['subscribers', pageController.subscribers],
    ['subscriptions', pageController.subscriptions],
    ['admins', pageController.admins],
    ['roles', pageController.roles],
    ['sales', pageController.sales],
    ['inventory', pageController.inventory],
    ['support', pageController.support],
    ['notifications', pageController.notifications],
    ['audit', pageController.audit],
    ['reports', pageController.reports],
    ['settings', pageController.settings],
    ['countries', pageController.countries],
    ['app-installs', pageController.appInstalls],
];

pages.forEach(([path, handler]) => {
    router.get(`/ui/${path}`, requireDashboardPage, asyncHandler(handler));
});

export default router;
