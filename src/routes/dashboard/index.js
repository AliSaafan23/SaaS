import express from "express";
import { requireDashboardSession } from "../../middleware/index.js";
import authRoute from "./auth/authRoute.js";
import pageRoute from "./pages/pageRoute.js";
import planRoute from "./plans/planRoute.js";
import customerRoute from "./customers/customerRoute.js";
import subscriptionRoute from "./subscriptions/subscriptionRoute.js";
import billingRoute from "./billing/billingRoute.js";

const router = express.Router();

router.use(pageRoute);
router.use("/auth", authRoute);

router.use(requireDashboardSession);

router.use("/plans", planRoute);
router.use("/customers", customerRoute);
router.use("/subscriptions", subscriptionRoute);
router.use(billingRoute);

export default router;
