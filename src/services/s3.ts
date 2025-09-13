import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3() as any;

class S3Service {
  // Configure multer for S3 uploads
  upload = multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKET_NAME!,
      acl: 'private',
      key: function (req, file, cb) {
        const folder = file.fieldname === 'pdf' ? 'pdfs' : 'thumbnails';
        const fileName = `${folder}/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
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
    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: `${folder}/${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
    };

    try {
      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    };

    try {
      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error(`Failed to delete file from S3: ${error}`);
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Expires: expiresIn,
    };

    try {
      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    };

    try {
      const result = await s3.getObject(params).promise();
      return result.Body as Buffer;
    } catch (error) {
      throw new Error(`Failed to download file from S3: ${error}`);
    }
  }

  extractKeyFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/'); // Remove bucket name and domain
  }
}

export default new S3Service();
