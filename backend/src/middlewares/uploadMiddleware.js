const multer = require('multer');
const path = require('path');
const { AppError } = require('./errorHandler');
const {
  validateImageFile,
  compressImages,
  addImageHash,
  processImagesPipeline,
} = require('./imageProcessing');

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * File size limit (10MB for initial upload, compression will reduce)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum number of files per upload
 */
const MAX_FILES = 5;

/**
 * Multer storage configuration
 * Using memory storage for cloud upload (Cloudinary)
 */
const storage = multer.memoryStorage();

/**
 * File filter to validate uploaded files
 */
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type: ${file.mimetype}. Allowed types: jpeg, jpg, png, webp, gif`,
        400
      ),
      false
    );
  }
};

/**
 * Configure multer for image uploads
 */
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

/**
 * Middleware for uploading multiple images
 * Field name: 'images'
 * Max files: 5
 */
const uploadImages = upload.array('images', MAX_FILES);

/**
 * Middleware for uploading a single image
 * Field name: 'image'
 */
const uploadSingleImage = upload.single('image');

/**
 * Error handler for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    let message;
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum is ${MAX_FILES} files`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field name. Use 'images' for multiple files or 'image' for single file`;
        break;
      default:
        message = err.message;
    }
    return next(new AppError(message, 400));
  }
  
  if (err) {
    return next(err);
  }
  
  next();
};

/**
 * Combined middleware for handling image uploads with error handling
 */
const uploadImagesMiddleware = (req, res, next) => {
  uploadImages(req, res, (err) => {
    handleUploadError(err, req, res, next);
  });
};

/**
 * Combined middleware for handling single image upload with error handling
 */
const uploadSingleImageMiddleware = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    handleUploadError(err, req, res, next);
  });
};

/**
 * Full image upload pipeline with validation and compression
 * 1. Multer upload
 * 2. Deep file validation (magic bytes, structure)
 * 3. Image compression (Sharp.js)
 * 4. Image hash generation (for deduplication)
 */
const uploadAndProcessImages = [
  uploadImagesMiddleware,
  validateImageFile,
  compressImages,
  addImageHash,
];

/**
 * Full single image upload pipeline
 */
const uploadAndProcessSingleImage = [
  uploadSingleImageMiddleware,
  validateImageFile,
  compressImages,
  addImageHash,
];

/**
 * Validate uploaded files (additional validation after multer)
 */
const validateUploadedFiles = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    // Log file info in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Uploaded ${req.files.length} file(s):`);
      req.files.forEach((file, index) => {
        const info = file.processingInfo 
          ? ` (${file.processingInfo.compressionRatio} compression)`
          : '';
        console.log(`  ${index + 1}. ${file.originalname} (${file.size} bytes)${info}`);
      });
    }
  }
  
  next();
};

module.exports = {
  uploadImages,
  uploadSingleImage,
  uploadImagesMiddleware,
  uploadSingleImageMiddleware,
  uploadAndProcessImages,
  uploadAndProcessSingleImage,
  validateUploadedFiles,
  handleUploadError,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
};
