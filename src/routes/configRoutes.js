import express from 'express';
import { getConfig, updateConfig } from '../controllers/configController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public endpoint to get config
router.get('/config', apiLimiter, getConfig);

// Admin endpoint to update config (you might want to add admin auth middleware)
router.post('/config', apiLimiter, updateConfig);

export default router;