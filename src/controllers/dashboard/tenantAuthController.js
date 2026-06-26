import i18n from "i18n";
import { ApiResponse } from "../../utils/index.js";
import { errorHandler } from "../../helpers/index.js";
import tenantAuth, {
  findTenantUserByEmail,
  validateTenantUser,
  validateTenantUserPassword,
  createDashboardSessionToken,
  registerTenant,
  verifyTenantEmail,
  resendActivationCode,
  sendAuthSuccess,
  sendRegisterPending,
} from "../../helpers/dashboard/tenantAuth.js";
import returnObject from "../../helpers/dashboard/returnobject.js";
import { UserToken } from "../../models/index.js";

export default {
  register: async (req, res) => {
    try {
      const { user } = await registerTenant(req);
      return sendRegisterPending(res, user);
    } catch (err) {
      if (err.code === "emailAlreadyExists") {
        return errorHandler(res, "fail", "emailAlreadyExists");
      }
      console.error(err);
      return errorHandler(res, "exception", "returnDeveloper");
    }
  },

  verifyEmail: async (req, res) => {
    const { email, code } = req.body;
    try {
      const user = await verifyTenantEmail(email, code);
      const token = await createDashboardSessionToken(user);
      req.session.token = token;
      return sendAuthSuccess(res, user, token);
    } catch (err) {
      if (err.code === "userNotFound") {
        return errorHandler(res, "notFound", "userNotFound");
      }
      if (err.code === "invalidActivationCode") {
        return errorHandler(res, "fail", "invalidActivationCode");
      }
      if (err.code === "activationCodeExpired") {
        return errorHandler(res, "fail", "activationCodeExpired");
      }
      console.error(err);
      return errorHandler(res, "exception", "returnDeveloper");
    }
  },

  resendCode: async (req, res) => {
    const { email } = req.body;
    try {
      await resendActivationCode(email);
      return res.send(
        new ApiResponse("success", i18n.__("activationCodeResent"), 200, {}),
      );
    } catch (err) {
      if (err.code === "userNotFound") {
        return errorHandler(res, "notFound", "userNotFound");
      }
      if (err.code === "emailAlreadyVerified") {
        return errorHandler(res, "fail", "emailAlreadyVerified");
      }
      console.error(err);
      return errorHandler(res, "exception", "returnDeveloper");
    }
  },

  signin: async (req, res) => {
    const { email, password } = req.body;
    const user = await findTenantUserByEmail(email);
    if (validateTenantUser(user, res) !== true) return;
    if ((await validateTenantUserPassword(user, password, res)) !== true)
      return;

    const token = await createDashboardSessionToken(user);
    req.session.token = token;
    return sendAuthSuccess(res, user, token);
  },

  signout: async (req, res) => {
    const token = req.session?.token;
    if (token) {
      await UserToken.update(
        { expired: true },
        { where: { token, userRef: "TenantUser" } },
      );
    }
    req.session.destroy(() => {
      res.send(
        new ApiResponse("success", i18n.__("logoutSuccessful"), 200, {}),
      );
    });
  },

  profile: async (req, res) => {
    res.send(
      new ApiResponse(
        "success",
        i18n.__("dataFetched"),
        200,
        returnObject.tenantUserProfile(req.tenantUser),
      ),
    );
  },
};
