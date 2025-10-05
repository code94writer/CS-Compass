import multer from 'multer';
import path from 'path';
import fs from 'fs';

const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/local'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

export const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  }
});

// Image upload configuration for course thumbnails
export const imageUpload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed!'));
    }
  }
});

export function ensureLocalFolders() {
  const pdfDir = path.join(__dirname, '../../uploads/local');
  const thumbDir = path.join(__dirname, '../../uploads/thumbnails');
  const courseThumbnailDir = path.join(__dirname, '../../uploads/course-thumbnails');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
  if (!fs.existsSync(courseThumbnailDir)) fs.mkdirSync(courseThumbnailDir, { recursive: true });
}
