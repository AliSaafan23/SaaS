import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import licenseController from '../../controllers/api/licenseController.js';
import licenseValidation from '../../utils/validations/api/licenseValidation.js';
import { requireOfflineLicense } from '../../middleware/api/verifyOfflineLicense.js';

const router = express.Router();

router.get('/schema', asyncHandler(licenseController.schema));
router.post('/activate', licenseValidation.validateActivate(), asyncHandler(licenseController.activate));
router.post('/refresh', licenseValidation.validateRefresh(), asyncHandler(licenseController.refresh));
router.get('/bootstrap', requireOfflineLicense, asyncHandler(licenseController.bootstrap));

export default router;
