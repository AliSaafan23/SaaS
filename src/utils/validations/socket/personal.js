import i18n from 'i18n';

export default {
    validateFindDrivers : (data) => {
        const { tripId, filters, page, limit } = data;

        if (!tripId || !filters || !page || !limit) {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        if (typeof page !== 'number' || typeof limit !== 'number') {
            return { status: false, message:  i18n.__("invalidRequest")}
        }

        return { status: true}
    },

    validateCustomerLocationUpdate : (data) => {
        const { location } = data;

        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            return { status: false, message: i18n.__("invalidLocation") }
        }

        return { status: true }
    }
}
