import i18n from 'i18n';
import { ApiResponse } from '../../../../utils/index.js';
import { getPosPaymentMethods } from '../../../../helpers/api/paymentMethods/paymentMethodService.js';

const lang = (req) => req.getLocale?.() || req.headers.lang || 'ar';

export default {
    list: async (req, res) => {
        const items = await getPosPaymentMethods(lang(req));
        res.send(new ApiResponse('success', i18n.__('dataFetched'), 200, items));
    },
};
