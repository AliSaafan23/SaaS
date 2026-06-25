import { Device } from '../../models/index.js';

export default async (userId, fcmToken, deviceType, userRef) => {
    await Device.create({userId, fcmToken, deviceType, userRef});
};