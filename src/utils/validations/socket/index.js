import i18n from 'i18n';

export default {
    validateSendMessage : (data) => {
        const { message, messageType = 'text', tripId, location } = data;

        // Validate required fields
        if (!message && !location) {
            return { status: false, message: i18n.__('messageRequired') };
        }
        
        if (!tripId) {
            return { status: false, message: i18n.__('tripIdRequired') };
        }

        // Validate messageType
        const validMessageTypes = ['text', 'location'];
        if (!validMessageTypes.includes(messageType)) {
            return { status: false, message: i18n.__('invalidMessageType') };
        }

        // Validate location data if messageType is location
        if (messageType === 'location' && location) {
            if (!location.latitude || !location.longitude || !location.address) {
                return { status: false, message: i18n.__('invalidLocationData') };
            }
        }

        return { status: true };
    },
    validateCancelTrip : (data) => {
        const { tripId } = data;

        if (!tripId) {
            return { status: false, message: i18n.__('tripIdRequired') };
        }

        return { status: true };
    }
}
