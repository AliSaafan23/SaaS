// lagacy code v1
// import axios from 'axios';
// import { errorHandler } from '../../helpers/index.js';

// const calculateDistanceAndTime = async (pickup, destination, res) => {
//     try {
//         const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickup.lat},${pickup.lng}&destinations=${destination.lat},${destination.lng}&key=${process.env.GOOGLE_API_KEY}`;

//         const response = await axios.get(url);
//         const { data } = response;

//         if (data.status !== "OK") {
//             return errorHandler(res, 'fail', "invalidRequest");
//         }

//         const element = data.rows[0].elements[0];
        
//         if (element.status === "OK") {
//             const { distance, duration } = element;
            
//             console.log(`Distance: ${distance.text}, Duration: ${duration.text}`);
            
//             return {
//                 totalDistanceKm: (distance.value / 1000).toFixed(2), // Convert to kilometers
//                 totalDurationMin: Math.ceil(duration.value / 60), // Convert to minutes
//             };
//         } else {
//             console.log(`Calculation failed:`, element.status);
//             return errorHandler(res, 'fail', "invalidRequest");
//         }
        
//     } catch (error) {
//         console.error("Error calculating distance and time:", error);
//         return errorHandler(res, 'exception', 'returnDeveloper');
//     }
// };

// export default calculateDistanceAndTime;

import axios from 'axios';
import { errorHandler } from '../../helpers/index.js';

const calculateDistanceAndTime = async (pickup, destination, res) => {
    try {
        const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${process.env.GOOGLE_API_KEY}`;

        const body = {
            origin: {
                location: {
                    latLng: { latitude: pickup.lat, longitude: pickup.lng }
                }
            },
            destination: {
                location: {
                    latLng: { latitude: destination.lat, longitude: destination.lng }
                }
            },
            travelMode: "DRIVE"
        };

        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
            }
        });
        const { data } = response;
        console.log(data);

        if (!data || !data.routes || !data.routes[0]) {
            return errorHandler(res, 'fail', "invalidRequest");
        }

        const route = data.routes[0];
        const distanceMeters = route.distanceMeters;
        const durationStr = route.duration; // e.g. "123s"

        if (typeof distanceMeters !== 'number' || !durationStr) {
            return errorHandler(res, 'fail', "invalidRequest");
        }

        const durationSeconds = Math.max(1, Math.ceil(parseFloat(String(durationStr).replace('s',''))));

        return {
            totalDistanceKm: (distanceMeters / 1000).toFixed(2),
            totalDurationMin: Math.ceil(durationSeconds / 60),
        };
        
    } catch (error) {
        console.error("Error calculating distance and time:", error);
        return errorHandler(res, 'exception', 'returnDeveloper');
    }
};

export default calculateDistanceAndTime;