import redisClient from './redisClient.js';
import i18n from "i18n";

/**
 * Assign a trip to a driver using Redis locks
 * @param {String} tripId - The trip ID
 * @param {String} driverId - The driver ID
 * @returns {Boolean} - Whether the lock was acquired
 */
const assignTripInRedis = async (tripId, driverId) => {
    const lockKey = `trip:${tripId}:lock`;

    try {
        // Try to acquire a lock
        const lockAcquired = await redisClient.set(lockKey, driverId, 'NX', 'EX', 10); // 10-second lock

        if (lockAcquired) {
            console.log(`Driver ${driverId} acquired lock for trip ${tripId}`);
            return true;
        }

        console.log(`Driver ${driverId} failed to acquire lock for trip ${tripId}`);
        return false;
    } catch (error) {
        console.error('Error with Redis lock:', error);
        return { message: i18n.__('returnDeveloper') }
    }
};

export default assignTripInRedis;