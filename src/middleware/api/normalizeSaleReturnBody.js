import { normalizeSaleReturnRequestBody } from '../../helpers/api/sales/saleReturnBodyNormalize.js';

/**
 * Accept JSON or x-www-form-urlencoded sale-return payloads in Postman.
 */
export const normalizeSaleReturnBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = normalizeSaleReturnRequestBody(req.body);
    }
    next();
};

export default normalizeSaleReturnBody;
