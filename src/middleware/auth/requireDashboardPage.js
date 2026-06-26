import jwt from "jsonwebtoken";
import { TenantUser, Tenant, UserToken } from "../../models/index.js";

const requireDashboardPage = async (req, res, next) => {
  try {
    const token = req.session?.token;
    if (!token || token === "null" || token.split(".").length !== 3) {
      return res.redirect("/dashboard/login");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch {
      req.session.destroy(() => {});
      return res.redirect("/dashboard/login");
    }

    const userId = payload.sub;
    const tenantId = payload.tenantId;
    if (!userId || !tenantId) {
      return res.redirect("/dashboard/login");
    }

    const stored = await UserToken.findOne({
      where: { userId, token, expired: false, userRef: "TenantUser" },
    });
    if (!stored) {
      return res.redirect("/dashboard/login");
    }

    const user = await TenantUser.findByPk(userId, {
      include: [{ model: Tenant, as: "tenant" }],
    });

    if (!user || user.status !== "active" || user.tenant?.status !== "active") {
      return res.redirect("/dashboard/login");
    }

    req.tenantId = tenantId;
    req.tenantUser = user;
    req.admin = user;
    req.user = user;
    return next();
  } catch (err) {
    console.error("requireDashboardPage error:", err);
    return res.redirect("/dashboard/login");
  }
};

export default requireDashboardPage;
