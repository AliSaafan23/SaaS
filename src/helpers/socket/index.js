import moment from 'moment-timezone';
import { DailyOnlineTime } from '../../models/index.js';

const updateDailyOnlineTime = async (userId, userType, sessionMinutes) => {
    try {
        if (sessionMinutes > 0) {
            const egyptTime = moment.tz('Africa/Cairo');
            const today = egyptTime.format('YYYY-MM-DD');

            const [record] = await DailyOnlineTime.findOrCreate({
                where: { userId, userType, date: today },
                defaults: { totalOnlineTime: 0 },
            });

            await record.increment('totalOnlineTime', { by: sessionMinutes });

            console.log(
                `Updated daily online time for ${userType} ${userId}: +${sessionMinutes} minutes (Egypt time: ${egyptTime.format('YYYY-MM-DD HH:mm:ss')})`
            );
        }
    } catch (error) {
        console.error(`Error updating daily online time for ${userType} ${userId}:`, error);
    }
};

const connectedUsers = {
    personal: new Map(),
    driver: new Map(),
    admin: new Map(),
    cashier: new Map(),
};

export {
    updateDailyOnlineTime,
    connectedUsers,
};
