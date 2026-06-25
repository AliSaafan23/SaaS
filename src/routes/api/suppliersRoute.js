import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import supplierValidation from '../../utils/validations/api/supplierValidation.js';
import supplierController from '../../controllers/api/pos/suppliers/supplierController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/search',
    requireSubscription('suppliers.view'),
    supplierValidation.validateSupplierSearch(),
    asyncHandler(supplierController.search)
);

router.get(
    '/opening-balances',
    requireSubscription('suppliers.view'),
    supplierValidation.validateOpeningBalanceSearch(),
    asyncHandler(supplierController.openingBalances)
);
router.patch(
    '/opening-balances/:id',
    requireSubscription('suppliers.create'),
    supplierValidation.validateUpdateOpeningBalance(),
    asyncHandler(supplierController.updateOpeningBalance)
);

router.get(
    '/payables',
    requireSubscription('suppliers.view'),
    supplierValidation.validateOpeningBalanceSearch(),
    asyncHandler(supplierController.payables)
);
router.get(
    '/reports/payables',
    requireSubscription('suppliers.view'),
    supplierValidation.validateOpeningBalanceSearch(),
    asyncHandler(supplierController.payablesReport)
);
router.get(
    '/reports/with-balances',
    requireSubscription('suppliers.view'),
    supplierValidation.validateOpeningBalanceSearch(),
    asyncHandler(supplierController.withBalancesReport)
);

router.get(
    '/',
    requireSubscription('suppliers.view'),
    supplierValidation.validateListSuppliers(),
    asyncHandler(supplierController.list)
);
router.post(
    '/',
    requireSubscription('suppliers.create'),
    supplierValidation.validateCreateSupplier(),
    asyncHandler(supplierController.create)
);
router.get(
    '/:id',
    requireSubscription('suppliers.view'),
    supplierValidation.validateSupplierId(),
    asyncHandler(supplierController.getById)
);
router.put(
    '/:id',
    requireSubscription('suppliers.create'),
    supplierValidation.validateUpdateSupplier(),
    asyncHandler(supplierController.update)
);
router.delete(
    '/:id',
    requireSubscription('suppliers.create'),
    supplierValidation.validateSupplierId(),
    asyncHandler(supplierController.remove)
);

export default router;
