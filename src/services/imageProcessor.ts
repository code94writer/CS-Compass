import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

class ImageProcessorService {
  /**
   * Process and optimize an image
   * @param inputBuffer - Input image buffer
   * @param options - Processing options
   * @returns Processed image buffer
   */
  async processImage(
    inputBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 85,
      format = 'jpeg'
    } = options;

    try {
      let sharpInstance = sharp(inputBuffer);

      // Get image metadata
      const metadata = await sharpInstance.metadata();

      // Resize if needed
      if (metadata.width && metadata.width > maxWidth) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert and compress based on format
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error(`Failed to process image: ${error}`);
    }
  }

  /**
   * Process and save an image to disk
   * @param inputBuffer - Input image buffer
   * @param outputPath - Output file path
   * @param options - Processing options
   */
  async processAndSaveImage(
    inputBuffer: Buffer,
    outputPath: string,
    options: ImageProcessingOptions = {}
  ): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Process image
      const processedBuffer = await this.processImage(inputBuffer, options);

      // Save to disk
      await fs.writeFile(outputPath, processedBuffer);
    } catch (error) {
      throw new Error(`Failed to process and save image: ${error}`);
    }
  }

  /**
   * Validate if a file is a valid image
   * @param buffer - File buffer
   * @returns True if valid image
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height);
    } catch {
      return false;
    }
  }

  /**
   * Get image metadata
   * @param buffer - Image buffer
   * @returns Image metadata
   */
  async getImageMetadata(buffer: Buffer) {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error}`);
    }
  }

  /**
   * Delete an image file
   * @param filePath - Path to the image file
   */
  async deleteImage(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as any).code !== 'ENOENT') {
        console.warn(`Failed to delete image: ${error}`);
      }
    }
  }
}

export default new ImageProcessorService();

