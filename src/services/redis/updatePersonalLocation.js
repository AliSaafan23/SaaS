import locationRedis from './redisClient.js';
import { Personal } from '../../models/index.js';

const MIN_MOVEMENT_KM = 0.1; // ✅ Support smaller movements for customers (100 meters)

// ✅ Function to update personal (customer) location in Redis & MongoDB
const updatePersonalLocation = async (personalId, lat, lng) => {
    try {
        let shouldUpdateMongo = false;
        let distanceMoved = 0;

        // ✅ Step 1: Retrieve the last stored previous location from Redis
        let prevLocation = await locationRedis.geoPos("customers", `customer:${personalId}:prev`);

        // ✅ Step 2: Store the new location immediately in Redis
        await locationRedis.geoAdd("customers", {
            longitude: lng,
            latitude: lat,
            member: `customer:${personalId}`
        });

        // 🚀 Step 3: If there's no previous location, store and return (First-time entry)
        if (!prevLocation || prevLocation.length === 0 || prevLocation[0] === null) {
            console.warn(`⚠️ No valid previous location found for customer ${personalId}. Storing initial location.`);

            // ✅ Store new location as `prev` for future calculations
            await locationRedis.geoAdd("customers", {
                longitude: lng,
                latitude: lat,
                member: `customer:${personalId}:prev`
            });
            // ✅ First-time, so store it in MongoDB
            await Personal.findOneAndUpdate(
                { _id: personalId },
                { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
            );
            console.log(`✅ Initial location stored for customer ${personalId}.`);
            return;
        }

        // 🚀 Step 4: Extract previous location correctly
        const prevLng = prevLocation[0].longitude;
        const prevLat = prevLocation[0].latitude;

        if (prevLng !== undefined && prevLat !== undefined) {
            // 🚀 Step 5: Calculate distance using geoDist
            distanceMoved = await locationRedis.geoDist("customers", `customer:${personalId}`, `customer:${personalId}:prev`, "km");

            if (distanceMoved >= MIN_MOVEMENT_KM) {
                shouldUpdateMongo = true;
            }
        }

        console.log(`📏 Customer ${personalId} Moved: ${distanceMoved.toFixed(3)} km`);

        // 🚀 Step 6: Update MongoDB only if movement is significant
        if (shouldUpdateMongo) {
            await Personal.findOneAndUpdate(
                { _id: personalId },
                { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
            );
            console.log(`✅ Customer ${personalId} moved ${distanceMoved.toFixed(3)} km, updating MongoDB.`);

            // ✅ Step 7: Update `prev` location in Redis for next comparison
            await locationRedis.geoAdd("customers", {
                longitude: lng,
                latitude: lat,
                member: `customer:${personalId}:prev`
            });
        }

    } catch (error) {
        console.error(`🚨 Error updating location for customer ${personalId}:`, error);
    }
};

export { updatePersonalLocation };
