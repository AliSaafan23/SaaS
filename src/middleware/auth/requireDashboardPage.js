import jwt from 'jsonwebtoken';
import { Admin, Role } from '../../models/index.js';

const requireDashboardPage = async (req, res, next) => {
    try {
        const token = req.session?.token;
        if (!token || token === 'null' || token.split('.').length !== 3) {
            return res.redirect('/dashboard/login');
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        } catch {
            req.session.destroy(() => {});
            return res.redirect('/dashboard/login');
        }

        const adminId = payload.sub ?? payload.subject?.id ?? payload.subject?._id;
        if (!adminId) return res.redirect('/dashboard/login');

        const admin = await Admin.findByPk(adminId, {
            include: [{ model: Role, as: 'role' }],
        });

        if (!admin || admin.status === 'delete' || admin.status === 'block') {
            req.session.destroy(() => {});
            return res.redirect('/dashboard/login');
        }

        req.admin = admin;
        req.user = admin;
        res.locals.user = admin;
        res.locals.permissions = admin.isAdmin ? ['all'] : admin.role?.permissions || [];
        return next();
    } catch (err) {
        console.error('requireDashboardPage error:', err);
        return res.redirect('/dashboard/login');
    }
};

export default requireDashboardPage;
