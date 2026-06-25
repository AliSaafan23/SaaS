import { Admin, Cashier, Merchant } from '../../models/index.js';

export default (userType) => {
    const modelMap = {
        admin: Admin,
        cashier: Cashier,
        merchant: Merchant,
    };

    return modelMap[userType];
};
