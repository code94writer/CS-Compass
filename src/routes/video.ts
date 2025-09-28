import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { videoController } from '../controllers/videoController';

const router = express.Router();

// Get all videos for a course (requires course purchase)
router.get('/course/:courseId', authenticateToken, videoController.getCourseVideos);

export default router;
