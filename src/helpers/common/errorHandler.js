import i18n from "i18n";
import { ApiError } from "../../utils/index.js";

const errorRes = new ApiError("", "");

export default (res, statusName, i18nMessage) => {
  const error = errorRes.responseError(statusName, i18nMessage);
  console.log({
    success: false,
    key: error.key,
    message: i18nMessage,
    code: error.code,
  });
  return res
    .status(errorRes.GetCode(statusName))
    .send(errorRes.responseError(statusName, i18n.__(i18nMessage)));
};
