import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PDFModel } from '../models/PDF';
import { CategoryModel } from '../models/Category';
import { PurchaseModel } from '../models/Purchase';
import { UserModel } from '../models/User';
import S3Service from '../services/s3';
import PDFWatermarkService from '../services/pdfWatermark';
import { AuthRequest } from '../middleware/auth';

export class PDFController {
  // Get all PDFs (public - for browsing)
  static async getAllPDFs(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, category, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let pdfs;
      if (search) {
        pdfs = await PDFModel.search(search as string, Number(limit), offset);
      } else {
        pdfs = await PDFModel.findAll(Number(limit), offset, category as string);
      }

      // Get categories for filter
      const categories = await CategoryModel.findAll();

      res.json({
        pdfs,
        categories,
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

  const { title, description, category_id, price } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.pdf || files.pdf.length === 0) {
        res.status(400).json({ error: 'PDF file is required' });
        return;
      }

      const pdfFile = files.pdf[0];
      const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;

      // Upload PDF to S3
      const pdfUrl = await S3Service.uploadFile(pdfFile, 'pdfs');
      
      // Upload thumbnail if provided
      let thumbnailUrl;
      if (thumbnailFile) {
        thumbnailUrl = await S3Service.uploadFile(thumbnailFile, 'thumbnails');
      }

      // Create PDF record
      const pdf = await PDFModel.create({
        title,
        description,
        category_id,
        price: parseFloat(price),
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
  const { title, description, category_id, price, is_active } = req.body;

      const pdf = await PDFModel.findById(id);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      const updateData: any = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (category_id) updateData.category_id = category_id;
  if (price) updateData.price = parseFloat(price);
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

      // Delete from S3
      const pdfKey = S3Service.extractKeyFromUrl(pdf.file_url);
      await S3Service.deleteFile(pdfKey);

      if (pdf.thumbnail_url) {
        const thumbnailKey = S3Service.extractKeyFromUrl(pdf.thumbnail_url);
        await S3Service.deleteFile(thumbnailKey);
      }

      // Delete from database
      await PDFModel.delete(id);

      res.json({ message: 'PDF deleted successfully' });
    } catch (error) {
      console.error('Delete PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Download PDF (authenticated users only)
  static async downloadPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const pdf = await PDFModel.findById(id);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      // Check if user has purchased this PDF
      const hasPurchased = await PurchaseModel.hasUserPurchased(userId, id);
      if (!hasPurchased) {
        res.status(403).json({ error: 'You must purchase this PDF before downloading' });
        return;
      }

      // Get user details for watermarking
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Download PDF from S3
      const pdfKey = S3Service.extractKeyFromUrl(pdf.file_url);
      const pdfBuffer = await S3Service.downloadFile(pdfKey);

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

  // Get user's purchased PDFs
  static async getUserPurchases(req: AuthRequest, res: Response): Promise<void> {
    try {
      const purchases = await PurchaseModel.findByUserId(req.user!.id);
      res.json({ purchases });
    } catch (error) {
      console.error('Get user purchases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get PDF preview (first page only for non-purchased PDFs)
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
          price: pdf.price,
          thumbnail_url: pdf.thumbnail_url,
        },
      });
    } catch (error) {
      console.error('Get PDF preview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
