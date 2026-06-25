import { Op } from 'sequelize';
import passport from 'passport';
import passportJwt from 'passport-jwt';
import i18n from 'i18n';
import { Admin, Role, UserToken } from '../../models/index.js';
import { modelMap } from '../../helpers/index.js';
import { errorHandler } from '../../helpers/index.js';

const { Strategy: JwtStrategy, ExtractJwt } = passportJwt;
const jwtSecret = process.env.JWT_SECRET;

const buildAdminWhere = (id) => ({
    id,
    status: 'active',
});

passport.use(
    'jwt',
    new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtSecret,
        },
        async (payload, done) => {
            try {
                if (payload.exp && Date.now() / 1000 >= payload.exp) {
                    return done(null, 'expired');
                }

                const userType = payload.userType || 'admin';
                const Model = modelMap(userType);

                if (!Model) {
                    return done(null, 'notFound');
                }

                if (userType === 'admin') {
                    const admin = await Model.findOne({
                        where: buildAdminWhere(payload.sub),
                        include: [{ model: Role, as: 'role' }],
                    });
                    if (!admin) return done(null, 'notFound');
                    return done(null, { userType: 'admin', record: admin });
                }

                if (userType === 'cashier') {
                    const cashier = await Model.findOne({
                        where: {
                            id: payload.sub,
                            status: { [Op.in]: ['active', 'pending'] },
                        },
                    });
                    if (!cashier) return done(null, 'notFound');
                    return done(null, { userType: 'cashier', record: cashier });
                }

                const user = await Model.findOne({
                    where: { id: payload.sub, active: true },
                });
                if (!user) return done(null, 'notFound');
                return done(null, { userType, record: user });
            } catch (err) {
                console.error('JWT Strategy error:', err);
                return done(null, false);
            }
        }
    )
);

const expireToken = async (token) => {
    if (token) {
        await UserToken.update({ expired: true }, { where: { token } });
    }
};

export const requireAuth = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, async (error, tokenUser) => {
        try {
            if (error || !tokenUser) {
                return errorHandler(res, 'unauthorized', 'tokenRequired');
            }

            if (tokenUser === 'expired') {
                const raw = req.headers.authorization?.replace('Bearer ', '');
                await expireToken(raw);
                return errorHandler(res, 'unauthorized', 'tokenExpired');
            }

            if (tokenUser === 'notFound') {
                return errorHandler(res, 'unauthorized', 'userNotFound');
            }

            const bearerToken = req.headers.authorization?.replace('Bearer ', '');
            const userId = tokenUser.record.id;
            const userRefMap = { admin: 'Admin', cashier: 'Cashier', merchant: 'Merchant' };
            const userRef = userRefMap[tokenUser.userType] || tokenUser.userType;

            const existToken = await UserToken.findOne({
                where: {
                    userId,
                    token: bearerToken,
                    expired: false,
                    userRef,
                },
            });

            if (!existToken) {
                return errorHandler(res, 'unauthorized', 'tokenExpired');
            }

            if (tokenUser.userType === 'admin') {
                const admin = tokenUser.record;

                if (!admin || admin.status !== 'active') {
                    await expireToken(bearerToken);
                    return errorHandler(res, 'blocked', 'accountStop');
                }

                req.admin = admin;
                req.user = admin;
                i18n.setLocale(admin.language || 'ar');
                return next();
            }

            if (tokenUser.userType === 'cashier') {
                const cashier = tokenUser.record;

                if (!cashier || cashier.status === 'delete' || cashier.status === 'block') {
                    await expireToken(bearerToken);
                    return errorHandler(res, 'blocked', 'accountStop');
                }

                req.cashier = cashier;
                req.user = cashier;
                req.cashierIsPending = cashier.status === 'pending';
                i18n.setLocale(cashier.language || 'ar');
                return next();
            }
        } catch (err) {
            console.error('requireAuth error:', err);
            return errorHandler(res, 'exception', 'returnDeveloper');
        }
    })(req, res, next);
};

/** Admin-only guard — must be used after requireAuth */
export const requireAdmin = (req, res, next) => {
    if (!req.admin) {
        return errorHandler(res, 'unauthorized', 'mustAuth');
    }
    next();
};

/** Cashier must have paid active subscription (not pending payment) */
export const requireActiveCashier = (req, res, next) => {
    if (!req.cashier) {
        return errorHandler(res, 'unauthorized', 'mustAuth');
    }
    if (req.cashier.status === 'pending' || req.cashierIsPending) {
        return errorHandler(res, 'fail', 'subscriptionRequired');
    }
    return next();
};

export default {
    requireAuth,
    requireAdmin,
    requireActiveCashier,
};
