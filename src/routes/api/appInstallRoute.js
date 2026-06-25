import express from 'express';
import { asyncHandler } from '../../middleware/index.js';
import appInstallValidation from '../../utils/validations/api/appInstallValidation.js';
import appInstallController from '../../controllers/api/appInstallController.js';

const router = express.Router();

router.post('/track-install', appInstallValidation.validateTrack(), asyncHandler(appInstallController.track));

export default router;
