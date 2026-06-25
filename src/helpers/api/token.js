import jwt from 'jsonwebtoken';
import { UserToken } from '../../models/index.js';

export default async (userId, userType, userRef = null, sessionMeta = {}) => {
    const resolvedRef = userRef || (userType === 'admin' ? 'Admin' : userType);

    const token = jwt.sign(
        {
            sub: userId,
            userType,
            iss: 'App',
            iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET,
        { expiresIn: '10d' }
    );

    await UserToken.create({
        userId,
        userRef: resolvedRef,
        token,
        deviceId: sessionMeta.deviceId || null,
        platform: sessionMeta.platform || null,
    });

    return token;
};
