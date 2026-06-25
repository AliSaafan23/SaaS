import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import adminCountryController from '../../controllers/dashboard/adminCountryController.js';

const router = express.Router();

router.get('/', asyncHandler(adminCountryController.publicList));

export default router;
