import paymentMethodReturnObject from './paymentMethodReturnObject.js';
import { listActivePaymentMethods } from '../../dashboard/paymentMethodService.js';

export const getPosPaymentMethods = async (lang = 'ar') => {
    const items = await listActivePaymentMethods();
    return items.map((item) => paymentMethodReturnObject.paymentMethod(item, lang));
};

export default { getPosPaymentMethods };
