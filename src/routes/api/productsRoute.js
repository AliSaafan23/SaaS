import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import { requireSubscription } from '../../middleware/protection/index.js';
import { cashierPosStack } from '../../middleware/api/cashierPosStack.js';
import inventoryValidation from '../../utils/validations/api/inventoryValidation.js';
import productController from '../../controllers/api/pos/inventory/productController.js';

const router = express.Router();
router.use(...cashierPosStack);

router.get(
    '/low-stock',
    requireSubscription('inventory.view'),
    asyncHandler(productController.lowStock)
);
router.get(
    '/deleted',
    requireSubscription('inventory.view'),
    inventoryValidation.validateListProducts(),
    asyncHandler(productController.deleted)
);
router.get(
    '/export',
    requireSubscription('inventory.view'),
    asyncHandler(productController.exportExcel)
);
router.get(
    '/import/template',
    requireSubscription('inventory.view'),
    asyncHandler(productController.exportTemplate)
);
router.post(
    '/import',
    requireSubscription('inventory.create'),
    inventoryValidation.validateImportProducts(),
    asyncHandler(productController.importExcel)
);
router.patch(
    '/prices/adjust',
    requireSubscription('inventory.create'),
    inventoryValidation.validateAdjustPrices(),
    asyncHandler(productController.adjustPrices)
);
router.patch(
    '/prices/bulk',
    requireSubscription('inventory.create'),
    inventoryValidation.validateBulkPrices(),
    asyncHandler(productController.bulkUpdatePrices)
);
router.patch(
    '/bulk/category',
    requireSubscription('inventory.create'),
    inventoryValidation.validateBulkCategory(),
    asyncHandler(productController.bulkChangeCategory)
);
router.post(
    '/deleted/restore-bulk',
    requireSubscription('inventory.create'),
    inventoryValidation.validateBulkIds(),
    asyncHandler(productController.bulkRestore)
);
router.delete(
    '/deleted/permanent-bulk',
    requireSubscription('inventory.create'),
    inventoryValidation.validateBulkIds(),
    asyncHandler(productController.bulkPermanentDelete)
);
router.get(
    '/barcode/:barcode',
    requireSubscription('inventory.view'),
    inventoryValidation.validateBarcodeLookup(),
    asyncHandler(productController.getByBarcode)
);

router.get(
    '/',
    requireSubscription('inventory.view'),
    inventoryValidation.validateListProducts(),
    asyncHandler(productController.list)
);
router.post(
    '/',
    requireSubscription('inventory.create'),
    inventoryValidation.validateCreateProduct(),
    asyncHandler(productController.create)
);
router.get(
    '/:id',
    requireSubscription('inventory.view'),
    inventoryValidation.validateProductId(),
    asyncHandler(productController.getById)
);
router.put(
    '/:id',
    requireSubscription('inventory.create'),
    inventoryValidation.validateUpdateProduct(),
    asyncHandler(productController.update)
);
router.delete(
    '/:id',
    requireSubscription('inventory.create'),
    inventoryValidation.validateProductId(),
    asyncHandler(productController.softDelete)
);
router.post(
    '/:id/restore',
    requireSubscription('inventory.create'),
    inventoryValidation.validateProductId(),
    asyncHandler(productController.restore)
);
router.delete(
    '/:id/permanent',
    requireSubscription('inventory.create'),
    inventoryValidation.validateProductId(),
    asyncHandler(productController.permanentDelete)
);

export default router;
