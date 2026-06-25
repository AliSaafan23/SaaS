import jwt from 'jsonwebtoken';
import { Merchant, Company } from '../../models/index.js';

const requireMerchantPage = async (req, res, next) => {
    try {
        const token = req.session?.token;
        if (!token || token === 'null' || token.split('.').length !== 3) {
            return res.redirect('/merchant/login');
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        } catch {
            req.session.destroy(() => {});
            return res.redirect('/merchant/login');
        }

        const merchantId = payload.sub ?? payload.subject?.id ?? payload.subject?._id;
        if (!merchantId) return res.redirect('/merchant/login');

        const merchant = await Merchant.findByPk(merchantId);
        if (!merchant || merchant.status === 'delete' || merchant.status === 'block') {
            req.session.destroy(() => {});
            return res.redirect('/merchant/login');
        }

        if (!merchant.active) {
            return res.redirect('/merchant/verify-email?email=' + encodeURIComponent(merchant.email));
        }

        const company = await Company.findByPk(merchant.companyId);

        req.merchant = merchant;
        req.user = merchant;
        req.company = company;
        res.locals.merchant = merchant;
        res.locals.company = company;
        return next();
    } catch (err) {
        console.error('requireMerchantPage error:', err);
        return res.redirect('/merchant/login');
    }
};

export default requireMerchantPage;
