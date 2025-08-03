import express from 'express';
import { getMyVideos, getVideoById, deleteVideo } from '../controllers/videoController.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(apiLimiter);

router.get('/myvideos', getMyVideos);
router.get('/videos/:id', getVideoById);
router.delete('/videos/:id', deleteVideo);

export default router;