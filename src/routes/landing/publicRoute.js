import express from 'express';
import publicController from '../../controllers/landing/publicController.js';
import { asyncHandler } from '../../middleware/index.js';

const router = express.Router();

// Landing page
router.get('/', asyncHandler(publicController.landing));

// Privacy Policy page
router.get('/privacy', asyncHandler(publicController.privacy));

// Terms & Conditions page
router.get('/terms', asyncHandler(publicController.terms));

// Contact Us page
router.get('/contact', asyncHandler(publicController.contact));

export default router;
