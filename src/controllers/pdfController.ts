import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PDFModel } from '../models/PDF';
import { UserModel } from '../models/User';
import UserCourseModel from '../models/UserCourse';
import PDFWatermarkService from '../services/pdfWatermark';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs/promises';
import { generateThumbnail } from '../services/pdfThumbnail';
import { ensureLocalFolders } from '../services/pdfLocal';

export class PDFController {
  // Get all PDFs (public - for browsing)
  static async getAllPDFs(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, course_id, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let pdfs;
      if (search) {
        pdfs = await PDFModel.search(search as string, Number(limit), offset);
      } else {
        pdfs = await PDFModel.findAll(Number(limit), offset, course_id as string);
      }

      res.json({
        pdfs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: pdfs.length,
        },
      });
    } catch (error) {
      console.error('Get PDFs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single PDF details (public)
  static async getPDFById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pdf = await PDFModel.findById(id);

      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      res.json({ pdf });
    } catch (error) {
      console.error('Get PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Upload PDF (admin only)
  static async uploadPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      ensureLocalFolders();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { title, description, course_id } = req.body;
      if (!course_id) {
        res.status(400).json({ error: 'course_id is required' });
        return;
      }
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.pdf || files.pdf.length === 0) {
        res.status(400).json({ error: 'PDF file is required' });
        return;
      }

      const pdfFile = files.pdf[0];
      const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;

      // Save PDF to local storage
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const pdfFileName = uniqueSuffix + '-' + pdfFile.originalname;
      const pdfPath = path.join(__dirname, '../../uploads/local', pdfFileName);

      await fs.writeFile(pdfPath, pdfFile.buffer);
      const pdfUrl = `uploads/local/${pdfFileName}`;

      // Generate or save thumbnail
      let thumbnailUrl;
      if (thumbnailFile) {
        const thumbnailFileName = uniqueSuffix + '-' + thumbnailFile.originalname;
        const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', thumbnailFileName);
        await fs.writeFile(thumbnailPath, thumbnailFile.buffer);
        thumbnailUrl = `uploads/thumbnails/${thumbnailFileName}`;
      } else {
        // Generate thumbnail from PDF
        const thumbName = pdfFileName.replace(/\.pdf$/i, '');
        thumbnailUrl = await generateThumbnail(pdfPath, thumbName);
      }

      // Create PDF record
      const pdf = await PDFModel.create({
        title,
        description,
        course_id,
        file_url: pdfUrl,
        thumbnail_url: thumbnailUrl,
        file_size: pdfFile.size,
        is_active: true,
        uploaded_by: req.user!.id,
      });

      res.status(201).json({
        message: 'PDF uploaded successfully',
        pdf,
      });
    } catch (error) {
      console.error('Upload PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update PDF (admin only)
  static async updatePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, course_id, is_active } = req.body;

      const pdf = await PDFModel.findById(id);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      const updateData: any = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (course_id) updateData.course_id = course_id;
      if (is_active !== undefined) updateData.is_active = is_active === 'true';

      const updatedPDF = await PDFModel.update(id, updateData);

      res.json({
        message: 'PDF updated successfully',
        pdf: updatedPDF,
      });
    } catch (error) {
      console.error('Update PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete PDF (admin only)
  static async deletePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pdf = await PDFModel.findById(id);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      // Delete from local storage
      try {
        const pdfPath = path.join(__dirname, '../../', pdf.file_url);
        await fs.unlink(pdfPath);
      } catch (err) {
        console.error('Error deleting PDF file:', err);
      }

      if (pdf.thumbnail_url) {
        try {
          const thumbnailPath = path.join(__dirname, '../../', pdf.thumbnail_url);
          await fs.unlink(thumbnailPath);
        } catch (err) {
          console.error('Error deleting thumbnail file:', err);
        }
      }

      // Delete from database
      await PDFModel.delete(id);

      res.json({ message: 'PDF deleted successfully' });
    } catch (error) {
      console.error('Delete PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Download PDF (authenticated users only) - checks course access
  static async downloadPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const pdf = await PDFModel.findById(id);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      // Check if user has access to the course containing this PDF
      const hasAccess = await UserCourseModel.hasAccess(userId, pdf.course_id);
      if (!hasAccess) {
        res.status(403).json({ error: 'You must purchase the course to access this PDF' });
        return;
      }

      // Get user details for watermarking
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Read PDF from local storage
      const pdfPath = path.join(__dirname, '../../', pdf.file_url);
      const pdfBuffer = await fs.readFile(pdfPath);

      // Add watermarks
      const watermarkedPDF = await PDFWatermarkService.addBothWatermarks(
        pdfBuffer,
        user.mobile,
        {
          position: 'bottom-right',
          opacity: 0.3,
          fontSize: 12,
          color: 'red',
        }
      );

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.title}.pdf"`);
      res.setHeader('Content-Length', watermarkedPDF.length);

      res.send(watermarkedPDF);
    } catch (error) {
      console.error('Download PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get PDF preview
  static async getPDFPreview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pdf = await PDFModel.findById(id);

      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      // For now, return a placeholder or the first page
      // In a real implementation, you would generate a preview image
      res.json({
        message: 'PDF preview not implemented yet',
        pdf: {
          id: pdf.id,
          title: pdf.title,
          description: pdf.description,
          thumbnail_url: pdf.thumbnail_url,
        },
      });
    } catch (error) {
      console.error('Get PDF preview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
