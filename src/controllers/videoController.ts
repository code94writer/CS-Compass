import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import VideoModel from '../models/Video';
import UserCourseModel from '../models/UserCourse';
import { ResponseHelper } from '../utils/response';

export class VideoController {
  // Get all videos for a course (requires course purchase)
  static async getCourseVideos(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      // Check if user has access to the course
      const hasAccess = await UserCourseModel.hasAccess(user.id, courseId);
      if (!hasAccess) {
        return ResponseHelper.error(res, 'No access or course expired', 403);
      }
      const videos = await VideoModel.findByCourseId(courseId);
      return ResponseHelper.success(res, videos);
    } catch (err) {
      return ResponseHelper.error(res, 'Internal server error', 500);
    }
  }
}

export const videoController = VideoController;
