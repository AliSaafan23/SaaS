import { AuditLog } from '../../models/index.js';

export const logAudit = async (req, { action, module, metadata = null }) => {
    try {
        await AuditLog.create({
            userId: req.admin?.id || null,
            userRef: 'Admin',
            userName: req.admin?.name || 'System',
            action,
            module,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
            metadata,
        });
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

export default { logAudit };
