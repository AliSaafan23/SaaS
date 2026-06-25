import locationRedis from './redisClient.js';

import { Driver } from '../../models/index.js';

const MIN_MOVEMENT_KM         = 0.5; // ✅ Update MongoDB if moved ≥ 500 meters
const DB_SYNC_INTERVAL        = 2 * 60 * 1000; // ✅ Sync Redis to MongoDB every 2 minutes
const SYNC_MONGO_THRESHOLD_KM = 0.2;

let distanceMoved = 0;

// ✅ Function to update driver location in Redis & MongoDB (when needed)
const updateDriverLocation = async (driverId, lat, lng) => {
    try {
        let shouldUpdateMongo = false;
        let distanceMoved = 0;

        // ✅ Step 1: Retrieve the last stored previous location from Redis
        let prevLocation = await locationRedis.geoPos("drivers", `driver:${driverId}:prev`);
        // // 🚀 Step 1: Get last known location from Redis
        // let prevLocation = await locationRedis.geoPos("drivers", `driver:${driverId}`);

        // ✅ Step 2: Store the new location immediately in Redis
        await locationRedis.geoAdd("drivers", {
            longitude: lng,
            latitude: lat,
            member: `driver:${driverId}`
        });

        // use them if needed
        // await locationRedis.persist("drivers");
        // await locationRedis.hSet(`driver:${driverId}`, "lastUpdated", Date.now());

        // 🚀 Step 2: If there's no previous location, store and return (First-time entry)
        if (!prevLocation || prevLocation.length === 0 || prevLocation[0] === null) {
            console.warn(`⚠️ No valid previous location found for driver ${driverId}. Storing initial location.`);

            // ✅ Store new location as `prev` for future calculations
            await locationRedis.geoAdd("drivers", {
                longitude: lng,
                latitude: lat,
                member: `driver:${driverId}:prev`
            });
            // ✅ First-time, so store it in MongoDB
            await Driver.findOneAndUpdate(
                { _id: driverId },
                { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
            );
            console.log(`✅ Initial location stored for driver ${driverId}.`);
            return;
        }

        // 🚀 Step 3: Extract previous location correctly
        const prevLng = prevLocation[0].longitude; // Longitude
        const prevLat = prevLocation[0].latitude; // Latitude

        if (prevLng !== undefined && prevLat !== undefined) {
            // 🚀 Step 4: Calculate distance using Haversine formula
            // distanceMoved = calculateHaversineDistance(
            //     { lat: prevLat, lng: prevLng },
            //     { lat, lng }
            // );
            // 🚀 Step 4: Calculate distance using geoDist
            distanceMoved = await locationRedis.geoDist("drivers", `driver:${driverId}`, `driver:${driverId}:prev`, "km");

            if (distanceMoved >= MIN_MOVEMENT_KM) {
                shouldUpdateMongo = true;
            }
        } else {
            console.warn(`⚠️ Invalid previous location format for driver ${driverId}. Skipping distance calculation.`);
        }

        console.log(`📏 Calculated Distance Moved: ${distanceMoved.toFixed(2)} km`);

        // // 🚀 Step 5: Update Redis with new location (always update Redis)
        // await locationRedis.geoAdd("drivers", {
        //     longitude: lng,
        //     latitude: lat,
        //     member: `driver:${driverId}`
        // });

        // 🚀 Step 6: Update MongoDB only if movement is significant
        if (shouldUpdateMongo) {
            await Driver.findOneAndUpdate(
                { _id: driverId },
                { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
            );
            console.log(`✅ Driver ${driverId} moved ${distanceMoved.toFixed(2)} km, updating MongoDB.`);
        } else {
            console.log(`📌 Driver ${driverId} moved ${distanceMoved.toFixed(2)} km, but below threshold. No DB update.`);
        }

        // ✅ Step 7: Update `prev` location in Redis for next comparison
        await locationRedis.geoAdd("drivers", {
            longitude: lng,
            latitude: lat,
            member: `driver:${driverId}:prev`
        });

    } catch (error) {
        console.error(`🚨 Error updating location for driver ${driverId}:`, error);
    }
};

// ✅ Periodic batch sync: Redis to MongoDB (every 2 minutes)
const BATCH_SIZE = 100; // Process 100 drivers at a time

const syncLocationsToMongo = async () => {
    console.log("🔄 Syncing Redis locations to MongoDB...");

    let start = 0;

    while (true) {
        // Fetch a batch of driver keys from Redis
        const allDrivers = await locationRedis.zRange("drivers", start, start + BATCH_SIZE - 1);
        if (!allDrivers.length) break;

        // Filter only real driver locations (exclude :prev and :synced)
        const driversBatch = allDrivers.filter(driver => !driver.includes(":prev") && !driver.includes(":synced"));
        if (!driversBatch.length) break;

        try {
            const updates = [];

            for (const driverKey of driversBatch) {
                const driverId = driverKey.replace("driver:", "");

                // Get current location
                const [currentLocation] = await locationRedis.geoPos("drivers", driverKey);
                if (!currentLocation) continue;

                const { longitude: lng, latitude: lat } = currentLocation;

                // Get last synced location
                const [syncedLocation] = await locationRedis.geoPos("drivers", `${driverKey}:synced`);

                let shouldUpdate = false;

                // If no synced location, sync immediately
                if (!syncedLocation || syncedLocation === null) {
                    shouldUpdate = true;
                } else {
                    // Compare distance between current and last synced location
                    const distance = await locationRedis.geoDist("drivers", driverKey, `${driverKey}:synced`, "km");
                    if (distance >= SYNC_MONGO_THRESHOLD_KM) {
                        shouldUpdate = true;
                    }
                }

                if (shouldUpdate) {
                    // Add to MongoDB bulk updates
                    updates.push({
                        updateOne: {
                            filter: { _id: driverId },
                            update: {
                                currentLocation: {
                                    type: 'Point',
                                    coordinates: [lng, lat] // ✅ Standard GeoJSON [lng, lat]
                                }
                            }
                        }
                    });

                    // Update `:synced` in Redis
                    await locationRedis.geoAdd("drivers", {
                        longitude: lng,
                        latitude: lat,
                        member: `${driverKey}:synced`
                    });

                    console.log(`✅ Driver ${driverId} moved, syncing to MongoDB.`);
                } else {
                    console.log(`⏩ Driver ${driverId} did not move ≥ ${SYNC_MONGO_THRESHOLD_KM} km, skipping DB update.`);
                }
            }

            // Execute bulk update if there are changes
            if (updates.length > 0) {
                await Driver.bulkWrite(updates);
                console.log(`✅ Synced ${updates.length} drivers to MongoDB.`);
            }
        } catch (error) {
            console.error("❌ Error syncing batch to MongoDB:", error);
        }

        start += BATCH_SIZE;
    }

    console.log("✅ Syncing Redis locations to MongoDB completed.");
};

let locationSyncInterval = null; // Track the interval

const startLocationSync = () => {
    if (locationSyncInterval) {
        console.log("🚀 Location sync is already running, skipping duplicate interval.");
        return; // Prevent multiple intervals
    }

    console.log("🔄 Starting periodic location sync...");

    locationSyncInterval = setInterval(syncLocationsToMongo, DB_SYNC_INTERVAL);
};

// startLocationSync(); // Runs automatically if the file is required

// ✅ Helper function: Get nearby driver IDs from Redis
const findNearbyDriverIds = async (lat, lng, radiusInKm, limit = 50) => {
    return await locationRedis.geoSearch("drivers", {
        longitude: lng,
        latitude: lat
    }, {
        radius: radiusInKm,
        unit: "km",
        COUNT: limit,
        SORT: "ASC"
    });
};

export { updateDriverLocation, findNearbyDriverIds, startLocationSync };

