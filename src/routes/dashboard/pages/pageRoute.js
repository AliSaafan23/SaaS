import express from "express";
import { requireDashboardPage, requirePagePermission } from "../../../middleware/index.js";
import pageController from "../../../controllers/dashboard/pageController.js";
import { DASHBOARD_PAGE_PERMISSIONS as P } from "../../../config/dashboardPagePermissions.js";

const router = express.Router();

router.get("/login", pageController.login);
router.get("/register", pageController.register);
router.get("/verify-email", pageController.verifyEmail);

router.get("/home", requireDashboardPage, pageController.home);
router.get("/ui/plans", requireDashboardPage, requirePagePermission(P.plans), pageController.plans);
router.get("/ui/customers", requireDashboardPage, requirePagePermission(P.customers), pageController.customers);
router.get("/ui/subscriptions", requireDashboardPage, requirePagePermission(P.subscriptions), pageController.subscriptions);
router.get("/ui/invoices", requireDashboardPage, requirePagePermission(P.invoices), pageController.invoices);
router.get("/ui/payments", requireDashboardPage, requirePagePermission(P.payments), pageController.payments);
router.get("/ui/reports", requireDashboardPage, requirePagePermission(P.reports), pageController.reports);
router.get("/ui/users", requireDashboardPage, requirePagePermission(P.users), pageController.users);
router.get("/ui/roles", requireDashboardPage, requirePagePermission(P.roles), pageController.roles);
router.get("/ui/profile", requireDashboardPage, pageController.profile);

export default router;
