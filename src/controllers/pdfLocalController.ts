import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import { PDFModel } from '../models/PDF';
import { generateThumbnail } from '../services/pdfThumbnail';
import { ensureLocalFolders } from '../services/pdfLocal';

export class PDFLocalController {
  static async uploadLocalPDF(req: AuthRequest, res: Response) {
    try {
      ensureLocalFolders();
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }
      const file = req.file;
      const pdfPath = file.path;
      const fileName = path.basename(pdfPath);
      const fileSize = file.size;
      const uploadedBy = req.user?.id || 'unknown';
      // Generate thumbnail
      const thumbName = fileName.replace(/\.pdf$/i, '');
      const thumbnailRelPath = await generateThumbnail(pdfPath, thumbName);
      // Save to DB
      const pdfData = {
        title: req.body.title || fileName,
        description: req.body.description || '',
        course_id: req.body.course_id || '',
        file_url: `uploads/local/${fileName}`,
        thumbnail_url: thumbnailRelPath,
        file_size: fileSize,
        is_active: true,
        uploaded_by: uploadedBy
      };
      const pdf = await PDFModel.create(pdfData);
      res.status(201).json({ pdf });
      return;
    } catch (error) {
      console.error('Local PDF upload error:', error);
      res.status(500).json({ error: 'Failed to upload PDF locally' });
      return;
    }
  }

  static async getLocalPDFs(req: Response, res?: any): Promise<void> {
    try {
      const pdfs = await PDFModel.findAll();
      // Filter for local PDFs (file_url starts with uploads/local/)
      const localPDFs = pdfs.filter(pdf => pdf.file_url.startsWith('uploads/local/'));
      (res || req).json({ pdfs: localPDFs });
      return;
    } catch (error) {
      console.error('Get local PDFs error:', error);
      (res || req).status(500).json({ error: 'Failed to fetch local PDFs' });
      return;
    }
  }
}
