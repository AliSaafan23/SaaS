import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import { normalizeSaleBody } from '../../middleware/api/normalizeSaleBody.js';
import saleValidation from '../../utils/validations/api/saleValidation.js';
import saleReturnValidation from '../../utils/validations/api/saleReturnValidation.js';
import saleController from '../../controllers/api/pos/sales/saleController.js';
import saleReturnController from '../../controllers/api/pos/sales/saleReturnController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/meta',
    requireSubscription('sales.view'),
    saleValidation.validateMeta(),
    asyncHandler(saleController.meta)
);

router.post(
    '/calculate',
    normalizeSaleBody,
    requireSubscription('sales.view'),
    saleValidation.validateCalculate(),
    asyncHandler(saleController.calculate)
);

router.get(
    '/customers/:customerId/receivable',
    requireSubscription('sales.view'),
    saleValidation.validateCustomerId(),
    asyncHandler(saleController.customerReceivable)
);

router.get(
    '/customer-payments',
    requireSubscription('sales.view'),
    saleValidation.validateListCustomerPayments(),
    asyncHandler(saleController.listCustomerPayments)
);

router.get(
    '/customer-payments/:customerId',
    requireSubscription('sales.view'),
    saleValidation.validateListCustomerPaymentsByCustomer(),
    asyncHandler(saleController.listCustomerPaymentsByCustomer)
);

router.post(
    '/customer-payments/:customerId',
    requireSubscription('sales.create'),
    saleValidation.validateCustomerDebtPayment(),
    asyncHandler(saleController.customerDebtPayment)
);

router.get(
    '/',
    requireSubscription('sales.view'),
    saleValidation.validateList(),
    asyncHandler(saleController.list)
);

router.post(
    '/',
    normalizeSaleBody,
    requireSubscription('sales.create'),
    saleValidation.validateCreate(),
    asyncHandler(saleController.create)
);

router.get(
    '/:id/pdf',
    requireSubscription('sales.view'),
    saleValidation.validateSaleInvoicePdf(),
    asyncHandler(saleController.invoicePdf)
);

router.get(
    '/:id/returnable',
    requireSubscription('sales.return'),
    saleReturnValidation.validateSaleIdParam(),
    asyncHandler(saleReturnController.returnable)
);

router.get(
    '/:id/returns',
    requireSubscription('sales.return'),
    saleReturnValidation.validateSaleIdParam(),
    asyncHandler(saleReturnController.listForSale)
);

router.get(
    '/:id',
    requireSubscription('sales.view'),
    saleValidation.validateSaleId(),
    asyncHandler(saleController.getById)
);

router.put(
    '/:id',
    normalizeSaleBody,
    requireSubscription('sales.create'),
    saleValidation.validateUpdate(),
    asyncHandler(saleController.update)
);

router.patch(
    '/:id/cancel',
    requireSubscription('sales.create'),
    saleValidation.validateSaleId(),
    asyncHandler(saleController.cancel)
);

export default router;
