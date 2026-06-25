import i18n from 'i18n';

export default {
    validateDriverLocationUpdate : (data) => {
        const { location } = data;

        if (!location || !location.lat || !location.lng) {
            return { status: false, message:  i18n.__("invalidLocationUpdate")}
        }

        if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            return { status: false, message:  i18n.__("invalidCoordinates")}
        }

        return { status: true}
    },
    validateTrip : (data) => {
        const { tripId } = data;

        if (!tripId) {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        return { status: true}
    },
    validateArrivalUpdateLocation : (data) => {
        const { tripId, location } = data;

        if (!tripId || !location || !location.lat || !location.lng) {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        return { status: true}
    },
    validateJoinRoom : (data) => {
        const { tripId } = data;

        if (!tripId) {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        return { status: true}
    },
    validateTripUpdateLocation : (data) => {
        const { tripId, location } = data;

        if (!tripId || !location || !location.lat || !location.lng) {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        return { status: true}
    },
    validateEndTrip : (data) => {
        const { tripId, distance } = data;

        if (!tripId || !distance) {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        return { status: true}
    }
}
