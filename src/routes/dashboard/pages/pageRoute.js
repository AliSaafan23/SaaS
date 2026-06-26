import express from "express";
import { requireDashboardPage } from "../../../middleware/index.js";
import pageController from "../../../controllers/dashboard/pageController.js";

const router = express.Router();

router.get("/login", pageController.login);
router.get("/register", pageController.register);
router.get("/verify-email", pageController.verifyEmail);

router.get("/home", requireDashboardPage, pageController.home);
router.get("/ui/plans", requireDashboardPage, pageController.plans);
router.get("/ui/customers", requireDashboardPage, pageController.customers);
router.get("/ui/subscriptions", requireDashboardPage, pageController.subscriptions);
router.get("/ui/invoices", requireDashboardPage, pageController.invoices);
router.get("/ui/payments", requireDashboardPage, pageController.payments);
router.get("/ui/reports", requireDashboardPage, pageController.reports);
router.get("/ui/users", requireDashboardPage, pageController.users);
router.get("/ui/roles", requireDashboardPage, pageController.roles);

export default router;
