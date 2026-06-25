import { normalizeSaleRequestBody } from '../../helpers/api/sales/saleBodyNormalize.js';

/**
 * Accept JSON or x-www-form-urlencoded sale payloads in Postman.
 * Converts flat productId/qty/price fields into items[] before validation.
 */
export const normalizeSaleBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = normalizeSaleRequestBody(req.body);
    }
    next();
};

export default normalizeSaleBody;
