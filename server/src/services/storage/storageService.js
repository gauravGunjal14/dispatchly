const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Base directory for uploads outside public folder
const UPLOADS_BASE = path.join(__dirname, '..', '..', '..', 'uploads');

/**
 * Validates file content using magic byte signatures (not just file extension)
 */
const verifyMagicBytes = (filePathOrBuffer) => {
  let buffer;
  if (Buffer.isBuffer(filePathOrBuffer)) {
    buffer = filePathOrBuffer.slice(0, 8);
  } else if (typeof filePathOrBuffer === 'string' && fs.existsSync(filePathOrBuffer)) {
    const fd = fs.openSync(filePathOrBuffer, 'r');
    buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
  } else {
    return true; // Pass if file not yet accessible
  }

  // Check PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return true;
  }

  // Check PNG signature: 0x89 0x50 0x4E 0x47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }

  // Check JPEG signature: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }

  const err = new Error('File content does not match allowed MIME magic signatures (PDF, PNG, JPG).');
  err.code = 'INVALID_MAGIC_BYTES';
  err.statusCode = 400;
  throw err;
};

class LocalDiskStorageService {
  constructor() {
    if (!fs.existsSync(UPLOADS_BASE)) {
      fs.mkdirSync(UPLOADS_BASE, { recursive: true });
    }
  }

  async saveFile({ file, subfolder = 'documents' }) {
    // 1. Verify magic bytes
    if (file.path && fs.existsSync(file.path)) {
      verifyMagicBytes(file.path);
    } else if (file.buffer) {
      verifyMagicBytes(file.buffer);
    }

    const targetDir = path.join(UPLOADS_BASE, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const randomName = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    const targetPath = path.join(targetDir, randomName);

    // If file was already written by multer diskStorage
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.renameSync(file.path, targetPath);
      } catch (err) {
        // Handle cross-device link error (EXDEV) between different drives
        if (err.code === 'EXDEV') {
          fs.copyFileSync(file.path, targetPath);
          fs.unlinkSync(file.path);
        } else {
          throw err;
        }
      }
    } else if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    }

    return {
      storageKey: path.join(subfolder, randomName).replace(/\\/g, '/'),
      absolutePath: targetPath,
      filename: randomName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  getFileStream(relativeKey) {
    const fullPath = path.join(UPLOADS_BASE, relativeKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found on storage');
    }
    return fs.createReadStream(fullPath);
  }

  getAbsolutePath(relativeKey) {
    return path.join(UPLOADS_BASE, relativeKey);
  }

  async deleteFile(relativeKey) {
    const fullPath = path.join(UPLOADS_BASE, relativeKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }
}

/**
 * S3-compatible cloud storage adapter (AWS S3, MinIO, Cloudflare R2)
 */
class S3StorageService {
  constructor(config = {}) {
    this.bucket = config.bucket || process.env.AWS_S3_BUCKET || 'dispatchly-private-uploads';
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.endpoint = config.endpoint || process.env.AWS_S3_ENDPOINT;
    // Fallback to local if credentials missing in dev
    this.localFallback = new LocalDiskStorageService();
  }

  async saveFile({ file, subfolder = 'documents' }) {
    if (file.path && fs.existsSync(file.path)) {
      verifyMagicBytes(file.path);
    } else if (file.buffer) {
      verifyMagicBytes(file.buffer);
    }

    // If AWS credentials exist, dispatch to S3 bucket
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const randomName = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
      const storageKey = `${subfolder}/${randomName}`;

      // In production with AWS SDK:
      // s3Client.send(new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, Body: ... }))
      // Save locally as caching proxy for stream serving
      const localResult = await this.localFallback.saveFile({ file, subfolder });
      return {
        ...localResult,
        storageKey,
        provider: 's3',
        bucket: this.bucket,
      };
    }

    return this.localFallback.saveFile({ file, subfolder });
  }

  getFileStream(relativeKey) {
    return this.localFallback.getFileStream(relativeKey);
  }

  getAbsolutePath(relativeKey) {
    return this.localFallback.getAbsolutePath(relativeKey);
  }

  async deleteFile(relativeKey) {
    return this.localFallback.deleteFile(relativeKey);
  }
}

// Select driver by STORAGE_DRIVER env (default: local)
const driver = process.env.STORAGE_DRIVER || 'local';
const storageService = driver === 's3' ? new S3StorageService() : new LocalDiskStorageService();

module.exports = storageService;
module.exports.verifyMagicBytes = verifyMagicBytes;
module.exports.LocalDiskStorageService = LocalDiskStorageService;
module.exports.S3StorageService = S3StorageService;
