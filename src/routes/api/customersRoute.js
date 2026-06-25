import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import customerValidation from '../../utils/validations/api/customerValidation.js';
import customerController from '../../controllers/api/pos/customers/customerController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/search',
    requireSubscription('customers.view'),
    customerValidation.validateCustomerSearch(),
    asyncHandler(customerController.search)
);

router.get(
    '/opening-balances',
    requireSubscription('customers.view'),
    customerValidation.validateOpeningBalanceSearch(),
    asyncHandler(customerController.openingBalances)
);
router.patch(
    '/opening-balances/:id',
    requireSubscription('customers.create'),
    customerValidation.validateUpdateOpeningBalance(),
    asyncHandler(customerController.updateOpeningBalance)
);

router.get(
    '/receivables',
    requireSubscription('customers.view'),
    customerValidation.validateOpeningBalanceSearch(),
    asyncHandler(customerController.receivables)
);
router.get(
    '/reports/receivables',
    requireSubscription('customers.view'),
    customerValidation.validateOpeningBalanceSearch(),
    asyncHandler(customerController.receivablesReport)
);
router.get(
    '/reports/with-balances',
    requireSubscription('customers.view'),
    customerValidation.validateOpeningBalanceSearch(),
    asyncHandler(customerController.withBalancesReport)
);

router.get(
    '/barcode/:barcode',
    requireSubscription('customers.view'),
    customerValidation.validateBarcodeLookup(),
    asyncHandler(customerController.getByBarcode)
);

router.get(
    '/',
    requireSubscription('customers.view'),
    customerValidation.validateListCustomers(),
    asyncHandler(customerController.list)
);
router.post(
    '/',
    requireSubscription('customers.create'),
    customerValidation.validateCreateCustomer(),
    asyncHandler(customerController.create)
);
router.get(
    '/:id',
    requireSubscription('customers.view'),
    customerValidation.validateCustomerId(),
    asyncHandler(customerController.getById)
);
router.put(
    '/:id',
    requireSubscription('customers.create'),
    customerValidation.validateUpdateCustomer(),
    asyncHandler(customerController.update)
);
router.delete(
    '/:id',
    requireSubscription('customers.create'),
    customerValidation.validateCustomerId(),
    asyncHandler(customerController.remove)
);

export default router;
