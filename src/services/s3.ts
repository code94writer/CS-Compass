// AWS S3 service disabled for basic functionality
// import AWS from 'aws-sdk';
import multer from 'multer';
// import multerS3 from 'multer-s3';

// AWS S3 service disabled for basic functionality
let s3: any = null;
let isConfigured = false;

console.warn('AWS S3 service disabled. File upload features will be disabled.');

class S3Service {
  // Configure multer for local storage (S3 disabled)
  upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000'), // 50MB
    },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'pdf' && file.mimetype === 'application/pdf') {
        cb(null, true);
      } else if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type') as any, false);
      }
    },
  });

  async uploadFile(file: Express.Multer.File, folder: string = 'pdfs'): Promise<string> {
    // S3 service disabled - return a mock URL for development
    console.warn('S3 service disabled. Returning mock file URL for development.');
    return `mock://uploads/${folder}/${Date.now()}-${file.originalname}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    console.warn('S3 service disabled. Cannot delete file.');
    return false;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    console.warn('S3 service disabled. Returning mock URL for development.');
    return `mock://signed-url/${key}`;
  }

  async downloadFile(key: string): Promise<Buffer> {
    console.warn('S3 service disabled. Cannot download file.');
    throw new Error('S3 service disabled. Please configure S3 credentials.');
  }

  extractKeyFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/'); // Remove bucket name and domain
  }
}

export default new S3Service();
