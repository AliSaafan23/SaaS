import { resolveTenantContext } from '../../utils/common/tenantIsolation.js';
import { errorHandler } from '../../helpers/index.js';

export const dataIsolation = async (req, res, next) => {
    try {
        await resolveTenantContext(req);

        if (req.cashier) {
            const requested =
                req.headers['x-branch-id'] || req.query.branchId || req.body?.branchId;

            if (
                requested != null &&
                req.branchId != null &&
                String(requested) !== String(req.branchId)
            ) {
                return errorHandler(res, 'fail', 'branchAccessDenied');
            }

            if (!req.branchId) {
                return errorHandler(res, 'fail', 'branchNotFound');
            }
        }

        next();
    } catch (err) {
        console.error('Data isolation middleware error:', err);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export default dataIsolation;
