import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { UserToken } from '../../models/index.js';
import { modelMap } from '../../helpers/index.js';
import i18n from 'i18n';

/**
 * Socket Authentication Middleware - Simplified
 * Verifies JWT token for socket connections
 */
const socketAuth = async (socket, next) => {
    try {
        // // Set language from headers
        // const acceptLanguage = socket.handshake.headers?.['accept-language'];
        // const lang = socket.handshake.headers?.['x-language'] || 
        //             socket.handshake.query?.lang ||
        //             (acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0] : 'en');
        
        // // Set the locale for this socket connection
        // i18n.setLocale(lang);
        
        // Get token from multiple possible sources
        let token = null;
        
        // Method 1: Authorization header (Bearer format) - works with Postman
        const authHeader = socket.handshake.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        
        // Method 2: Auth object - works with some Socket.IO clients
        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
        }
        
        // Method 3: Query parameter - fallback method
        if (!token && socket.handshake.query?.token) {
            token = socket.handshake.query.token;
        }
        
        if (!token) {
            return next(new Error(i18n.__('tokenRequired')));
        }

        // Verify JWT token
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload.sub || !payload.userType) {
            return next(new Error(i18n.__('invalidToken')));
        }

        // Get user model based on userType
        const Model = modelMap(payload.userType);
        if (!Model) {
            return next(new Error(i18n.__('invalidUserType')));
        }

        const user = await Model.findOne({
            where: {
                id: payload.sub,
                active: true,
                status: { [Op.ne]: 'delete' },
            },
        });

        if (!user) {
            return next(new Error(i18n.__('userNotFound')));
        }

        // Check user status
        if (user.status === "block") {
            return next(new Error(i18n.__('accountStop')));
        }

        if (user.status === "deletePending") {
            return next(new Error(i18n.__('deleteAccountPending')));
        }

        // Verify token exists in database
        const existToken = await UserToken.findOne({
            where: {
                userId: user.id,
                token,
                expired: false,
            },
        });

        if (!existToken) {
            return next(new Error(i18n.__('tokenExpired')));
        }

        // Attach user data to socket
        socket.userId = user.id;
        socket.userType = user.userType;
        socket.user = user;

        console.log(`✅ Socket authenticated: ${user.id} (${user.userType})`);
        next();

    } catch (error) {
        console.error("❌ Socket Auth Error:", error.message);
        next(new Error(i18n.__('returnDeveloper')));
    }
};

export default socketAuth;