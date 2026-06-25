export { default as redisClient } from './redisClient.js';
export { default as assignTripInRedis } from './redisLocks.js';

// [TAXI - COMMENTED] Geo location sync disabled for POS scaffold
// export { updateDriverLocation, findNearbyDriverIds, startLocationSync } from './updateDriverLocation.js';
// export { updatePersonalLocation } from './updatePersonalLocation.js';

export const startLocationSync = () => {
    console.log('ℹ️  Location sync disabled (legacy taxi feature)');
};

export const updateDriverLocation = async () => {};
export const findNearbyDriverIds = async () => [];
export const updatePersonalLocation = async () => {};
