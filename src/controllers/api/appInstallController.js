import i18n from 'i18n';
import { ApiResponse } from '../../utils/index.js';
import { errorHandler } from '../../helpers/index.js';
import { trackAppInstall } from '../../helpers/api/appInstallService.js';
import returnObject from '../../helpers/dashboard/returnobject.js';

export default {
    track: async (req, res) => {
        try {
            const { install, isNew } = await trackAppInstall(req, req.body);
            const lang = req.headers.lang === 'en' ? 'en' : 'ar';

            res.send(
                new ApiResponse('success', i18n.__('appInstallTracked'), 200, {
                    ...returnObject.appInstall(install, lang),
                    isNew,
                })
            );
        } catch (e) {
            const key = e.message === 'deviceIdRequired' ? 'deviceIdRequired' : 'validationError';
            return errorHandler(res, 'fail', key);
        }
    },
};
