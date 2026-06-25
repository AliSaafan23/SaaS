import { ApiResponse } from '../../../utils/index.js';

/**
 * Placeholder handler until department business logic is implemented.
 */
export const moduleStatus = (moduleName) => (req, res) =>
    res.send(
        new ApiResponse('success', 'Module infrastructure ready', 200, {
            module: moduleName,
            status: 'pending_implementation',
            tenant: {
                companyId: req.companyId ?? null,
                branchId: req.branchId ?? null,
            },
        })
    );

export default { moduleStatus };
