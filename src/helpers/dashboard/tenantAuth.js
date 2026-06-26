import jwt from "jsonwebtoken";
import i18n from "i18n";
import { Op } from "sequelize";
import {
  sequelize,
  Tenant,
  TenantUser,
  TenantRole,
  UserToken,
} from "../../models/index.js";
import errorHandler from "../common/errorHandler.js";
import returnObject from "./returnobject.js";
import { ApiResponse } from "../../utils/index.js";
import { seedChartOfAccounts } from "../accounting/seedChartOfAccounts.js";
import { generateCode } from "../../utils/common/generateCode.js";
import { sendActivationEmail } from "../common/mailService.js";
import {
  DEFAULT_ROLE_SLUGS,
  OWNER_PERMISSIONS,
} from "../../config/tenantPermissions.js";
import uploadFiles from "../../utils/common/uploadFiles.js";

const normalizeEmail = (email) => email?.trim().toLowerCase();

const slugify = (name) =>
  `${name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40)}-${Date.now()}`;

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

export const findTenantUserByEmail = async (email) =>
  TenantUser.scope("withPassword").findOne({
    where: { email: normalizeEmail(email), status: { [Op.ne]: "delete" } },
    include: [
      { model: Tenant, as: "tenant" },
      { model: TenantRole, as: "role" },
    ],
  });

export const validateTenantUser = (user, res) => {
  if (!user) return errorHandler(res, "notFound", "userNotFound");
  if (user.status === "block")
    return errorHandler(res, "blocked", "accountStop");
  if (user.status === "delete")
    return errorHandler(res, "notFound", "userNotFound");
  if (!user.emailVerified)
    return errorHandler(res, "needActive", "emailNotVerified");
  if (user.tenant?.status === "suspended")
    return errorHandler(res, "blocked", "tenantSuspended");
  return true;
};

export const validateTenantUserPassword = async (user, password, res) => {
  const isMatch = await user.comparePassword(password);
  if (!isMatch) return errorHandler(res, "fail", "invalidEmailOrPassword");
  return true;
};

export const createDashboardSessionToken = async (user) => {
  const token = jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId,
      userType: "TenantUser",
      iss: "App",
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "24h" },
  );

  await UserToken.update(
    { expired: true },
    { where: { userId: user.id, userRef: "TenantUser" } },
  );

  await UserToken.create({
    userId: user.id,
    userRef: "TenantUser",
    token,
    expired: false,
  });

  return token;
};

export const registerTenant = async (req) => {
  const {
    companyName,
    companyEmail,
    adminName,
    email,
    password,
  } = req.body;

  const normalizedEmail = normalizeEmail(email);
  const normalizedCompanyEmail = companyEmail
    ? normalizeEmail(companyEmail)
    : normalizedEmail;

  const existing = await TenantUser.scope("withPassword").findOne({
    where: { email: normalizedEmail },
  });
  if (existing) {
    const err = new Error("emailAlreadyExists");
    err.code = "emailAlreadyExists";
    throw err;
  }

  let logo = null;
  if (req.files?.logo) {
    const uploads = await uploadFiles.handleMultipleUploads(req, [
      { name: "logo", type: "image", dir: "tenants" },
    ]);
    logo = uploads.logo;
  }

  const activationCode = await generateCode();
  const activationCodeExpiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);

  return sequelize.transaction(async (transaction) => {
    const tenant = await Tenant.create(
      {
        name: companyName,
        slug: slugify(companyName),
        status: "active",
        logo,
        companyEmail: normalizedCompanyEmail,
      },
      { transaction },
    );

    const ownerRole = await TenantRole.create(
      {
        tenantId: tenant.id,
        name: "Owner",
        slug: DEFAULT_ROLE_SLUGS.OWNER,
        permissions: OWNER_PERMISSIONS,
        isSystem: true,
      },
      { transaction },
    );

    const user = await TenantUser.create(
      {
        tenantId: tenant.id,
        roleId: ownerRole.id,
        name: adminName,
        email: normalizedEmail,
        password,
        status: "active",
        emailVerified: false,
        activationCode,
        activationCodeExpiresAt,
      },
      { transaction },
    );

    await seedChartOfAccounts(tenant.id, transaction);

    await sendActivationEmail({
      to: normalizedEmail,
      name: adminName,
      code: activationCode,
    });

    return { tenant, user };
  });
};

export const verifyTenantEmail = async (email, code) => {
  const user = await TenantUser.scope("withPassword").findOne({
    where: { email: normalizeEmail(email), status: { [Op.ne]: "delete" } },
    include: [
      { model: Tenant, as: "tenant" },
      { model: TenantRole, as: "role" },
    ],
  });

  if (!user) {
    const err = new Error("userNotFound");
    err.code = "userNotFound";
    throw err;
  }

  if (user.emailVerified) return user;

  if (!user.activationCode || user.activationCode !== String(code).trim()) {
    const err = new Error("invalidActivationCode");
    err.code = "invalidActivationCode";
    throw err;
  }

  if (
    user.activationCodeExpiresAt &&
    new Date() > new Date(user.activationCodeExpiresAt)
  ) {
    const err = new Error("activationCodeExpired");
    err.code = "activationCodeExpired";
    throw err;
  }

  await user.update({
    emailVerified: true,
    activationCode: null,
    activationCodeExpiresAt: null,
  });

  return user;
};

export const resendActivationCode = async (email) => {
  const user = await TenantUser.scope("withPassword").findOne({
    where: { email: normalizeEmail(email), status: { [Op.ne]: "delete" } },
  });

  if (!user) {
    const err = new Error("userNotFound");
    err.code = "userNotFound";
    throw err;
  }

  if (user.emailVerified) {
    const err = new Error("emailAlreadyVerified");
    err.code = "emailAlreadyVerified";
    throw err;
  }

  const activationCode = await generateCode();
  const activationCodeExpiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);

  await user.update({ activationCode, activationCodeExpiresAt });
  await sendActivationEmail({
    to: user.email,
    name: user.name,
    code: activationCode,
  });

  return user;
};

export const sendAuthSuccess = (res, user, token) => {
  res.send(
    new ApiResponse("success", i18n.__("loginSuccessful"), 200, {
      ...returnObject.tenantUserProfile(user),
      token,
    }),
  );
};

export const sendRegisterPending = (res, user) => {
  res.send(
    new ApiResponse("success", i18n.__("registerPendingVerification"), 200, {
      email: user.email,
      needActivation: true,
    }),
  );
};

export default {
  findTenantUserByEmail,
  validateTenantUser,
  validateTenantUserPassword,
  createDashboardSessionToken,
  registerTenant,
  verifyTenantEmail,
  resendActivationCode,
  sendAuthSuccess,
  sendRegisterPending,
};
