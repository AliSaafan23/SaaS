import i18n from "i18n";
import { ApiResponse } from "../../utils/index.js";
import { errorHandler } from "../../helpers/index.js";
import returnObject from "../../helpers/dashboard/returnobject.js";
import { Customer } from "../../models/index.js";
import uploadFiles from "../../utils/common/uploadFiles.js";
import deleteFiles from "../../utils/common/deleteFiles.js";

const tenantWhere = (req, extra = {}) => ({ tenantId: req.tenantId, ...extra });

export default {
  list: async (req, res) => {
    const customers = await Customer.findAll({
      where: tenantWhere(req),
      order: [["name", "ASC"]],
    });
    res.send(
      new ApiResponse(
        "success",
        i18n.__("dataFetched"),
        200,
        customers.map((c) => returnObject.customer(c)),
      ),
    );
  },

  getById: async (req, res) => {
    const customer = await Customer.findOne({
      where: tenantWhere(req, { id: req.params.id }),
    });
    if (!customer) return errorHandler(res, "notFound", "customerNotFound");
    res.send(
      new ApiResponse(
        "success",
        i18n.__("dataFetched"),
        200,
        returnObject.customer(customer),
      ),
    );
  },

  create: async (req, res) => {
    const { name, email, phone, status } = req.body;

    let avatar = null;
    if (req.files?.avatar) {
      const uploads = await uploadFiles.handleMultipleUploads(req, [
        { name: "avatar", type: "image", dir: "customers" },
      ]);
      avatar = uploads.avatar;
    }

    const customer = await Customer.create({
      tenantId: req.tenantId,
      name,
      email,
      phone,
      avatar,
      status: status || "active",
    });

    res.send(
      new ApiResponse(
        "success",
        i18n.__("customerCreated"),
        201,
        returnObject.customer(customer),
      ),
    );
  },

  update: async (req, res) => {
    const customer = await Customer.findOne({
      where: tenantWhere(req, { id: req.params.id }),
    });
    if (!customer) return errorHandler(res, "notFound", "customerNotFound");

    const { name, email, phone, status } = req.body;
    const updates = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(status !== undefined && { status }),
    };

    if (req.files?.avatar) {
      if (customer.avatar) {
        deleteFiles.removeFile(customer.avatar, "customers", "image");
      }
      const uploads = await uploadFiles.handleMultipleUploads(req, [
        { name: "avatar", type: "image", dir: "customers" },
      ]);
      updates.avatar = uploads.avatar;
    }

    await customer.update(updates);

    res.send(
      new ApiResponse(
        "success",
        i18n.__("customerUpdated"),
        200,
        returnObject.customer(customer),
      ),
    );
  },

  remove: async (req, res) => {
    const customer = await Customer.findOne({
      where: tenantWhere(req, { id: req.params.id }),
    });
    if (!customer) return errorHandler(res, "notFound", "customerNotFound");
    if (customer.avatar) {
      deleteFiles.removeFile(customer.avatar, "customers", "image");
    }
    await customer.destroy();
    res.send(new ApiResponse("success", i18n.__("customerDeleted"), 200, {}));
  },
};
