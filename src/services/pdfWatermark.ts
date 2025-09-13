import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { WatermarkOptions } from '../types';

class PDFWatermarkService {
  async addWatermark(
    pdfBuffer: Buffer,
    mobile: string,
    options: Partial<WatermarkOptions> = {}
  ): Promise<Buffer> {
    const {
      position = 'bottom-right',
      opacity = 0.3,
      fontSize = 12,
      color = 'red'
    } = options;

    try {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();

      // Add watermark to each page
      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Calculate position based on option
        let x, y;
        switch (position) {
          case 'top-left':
            x = 50;
            y = height - 50;
            break;
          case 'top-right':
            x = width - 200;
            y = height - 50;
            break;
          case 'bottom-left':
            x = 50;
            y = 50;
            break;
          case 'bottom-right':
            x = width - 200;
            y = 50;
            break;
          case 'center':
            x = width / 2 - 100;
            y = height / 2;
            break;
          default:
            x = width - 200;
            y = 50;
        }

        // Parse color
        let colorRgb;
        switch (color.toLowerCase()) {
          case 'red':
            colorRgb = rgb(1, 0, 0);
            break;
          case 'blue':
            colorRgb = rgb(0, 0, 1);
            break;
          case 'green':
            colorRgb = rgb(0, 1, 0);
            break;
          case 'black':
            colorRgb = rgb(0, 0, 0);
            break;
          default:
            colorRgb = rgb(1, 0, 0);
        }

        // Add watermark text
        page.drawText(`Mobile: ${mobile}`, {
          x,
          y,
          size: fontSize,
          color: colorRgb,
          opacity: opacity,
        });
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      throw new Error(`Failed to add watermark: ${error}`);
    }
  }

  async addInvisibleWatermark(
    pdfBuffer: Buffer,
    mobile: string
  ): Promise<Buffer> {
    try {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Add invisible watermark as metadata
      pdfDoc.setTitle(`CS Compass - ${mobile}`);
      pdfDoc.setSubject(`Purchased by: ${mobile}`);
      pdfDoc.setKeywords([mobile, 'CS Compass', 'Watermarked']);
      pdfDoc.setProducer('CS Compass PDF Service');
      pdfDoc.setCreator('CS Compass');

      // Add custom properties
      const customProperties = {
        'Watermark': mobile,
        'PurchaseDate': new Date().toISOString(),
        'Source': 'CS Compass'
      };

      // Note: pdf-lib doesn't support custom properties directly
      // This is a simplified approach - in production, you might want to use
      // a more advanced PDF library that supports custom metadata

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      throw new Error(`Failed to add invisible watermark: ${error}`);
    }
  }

  async addBothWatermarks(
    pdfBuffer: Buffer,
    mobile: string,
    visibleOptions: Partial<WatermarkOptions> = {}
  ): Promise<Buffer> {
    try {
      // First add visible watermark
      let watermarkedPdf = await this.addWatermark(pdfBuffer, mobile, visibleOptions);
      
      // Then add invisible watermark
      watermarkedPdf = await this.addInvisibleWatermark(watermarkedPdf, mobile);
      
      return watermarkedPdf;
    } catch (error) {
      throw new Error(`Failed to add both watermarks: ${error}`);
    }
  }

  async generateThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      // This is a placeholder - you would need to implement actual PDF to image conversion
      // You might want to use pdf2pic or similar library
      // For now, return a placeholder image
      const placeholderImage = Buffer.from('placeholder-image-data');
      return placeholderImage;
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error}`);
    }
  }
}

export default new PDFWatermarkService();
