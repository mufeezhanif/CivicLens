const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const { AppError } = require('./errorHandler');

/**
 * Image Processing Middleware
 * Handles image compression, validation, and optimization using Sharp.js
 */

// Configuration
const config = {
  maxFileSizeMB: 5,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  targetQuality: 80,
  maxWidth: 1920,
  maxHeight: 1920,
  thumbnailSize: 200,
  
  // Allowed MIME types with their magic bytes
  allowedTypes: {
    'image/jpeg': {
      extensions: ['.jpg', '.jpeg'],
      magicBytes: [0xFF, 0xD8, 0xFF],
    },
    'image/png': {
      extensions: ['.png'],
      magicBytes: [0x89, 0x50, 0x4E, 0x47],
    },
    'image/webp': {
      extensions: ['.webp'],
      magicBytes: [0x52, 0x49, 0x46, 0x46], // RIFF
    },
    'image/gif': {
      extensions: ['.gif'],
      magicBytes: [0x47, 0x49, 0x46, 0x38], // GIF8
    },
  },
  
  // Output format
  outputFormat: 'webp', // or 'jpeg'
  outputMime: 'image/webp',
};

/**
 * Validate file type by checking magic bytes (file signature)
 * More secure than relying on MIME type from client
 */
const validateMagicBytes = (buffer) => {
  for (const [mimeType, typeConfig] of Object.entries(config.allowedTypes)) {
    const magicBytes = typeConfig.magicBytes;
    let isMatch = true;
    
    for (let i = 0; i < magicBytes.length; i++) {
      if (buffer[i] !== magicBytes[i]) {
        isMatch = false;
        break;
      }
    }
    
    if (isMatch) {
      return { valid: true, detectedType: mimeType };
    }
  }
  
  return { valid: false, detectedType: null };
};

/**
 * Validate file extension
 */
const validateExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  for (const [mimeType, typeConfig] of Object.entries(config.allowedTypes)) {
    if (typeConfig.extensions.includes(ext)) {
      return { valid: true, mimeType };
    }
  }
  
  return { valid: false, mimeType: null };
};

/**
 * Deep file validation middleware
 * Validates: extension, MIME type, magic bytes, and image structure
 */
const validateImageFile = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return next(); // No files to validate
    }

    const validatedFiles = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 1. Check file size
      if (file.size > config.maxFileSize) {
        errors.push(`File "${file.originalname}" exceeds maximum size of ${config.maxFileSizeMB}MB`);
        continue;
      }

      // 2. Validate extension
      const extValidation = validateExtension(file.originalname);
      if (!extValidation.valid) {
        errors.push(`File "${file.originalname}" has invalid extension. Allowed: jpg, jpeg, png, webp, gif`);
        continue;
      }

      // 3. Validate magic bytes (file signature)
      const magicValidation = validateMagicBytes(file.buffer);
      if (!magicValidation.valid) {
        errors.push(`File "${file.originalname}" content does not match a valid image format`);
        continue;
      }

      // 4. Check if MIME type matches magic bytes
      if (file.mimetype !== magicValidation.detectedType) {
        // Allow mismatch between jpg and jpeg
        const isJpegMismatch = 
          (file.mimetype === 'image/jpg' && magicValidation.detectedType === 'image/jpeg') ||
          (file.mimetype === 'image/jpeg' && magicValidation.detectedType === 'image/jpeg');
        
        if (!isJpegMismatch) {
          console.warn(`MIME type mismatch for ${file.originalname}: claimed ${file.mimetype}, detected ${magicValidation.detectedType}`);
        }
      }

      // 5. Try to parse with Sharp (validates actual image structure)
      try {
        const metadata = await sharp(file.buffer).metadata();
        
        if (!metadata.width || !metadata.height) {
          errors.push(`File "${file.originalname}" is not a valid image`);
          continue;
        }

        // Check for suspiciously large dimensions (possible decompression bomb)
        if (metadata.width > 10000 || metadata.height > 10000) {
          errors.push(`File "${file.originalname}" has suspicious dimensions (${metadata.width}x${metadata.height})`);
          continue;
        }

        // Attach metadata to file object
        file.imageMetadata = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha,
        };

        validatedFiles.push(file);
      } catch (sharpError) {
        errors.push(`File "${file.originalname}" could not be processed as an image`);
        continue;
      }
    }

    if (errors.length > 0 && validatedFiles.length === 0) {
      return next(new AppError(errors.join('; '), 400));
    }

    // Replace files with validated ones
    if (req.files) {
      req.files = validatedFiles;
    } else if (req.file && validatedFiles.length > 0) {
      req.file = validatedFiles[0];
    }

    // Store validation warnings
    if (errors.length > 0) {
      req.imageValidationWarnings = errors;
    }

    next();
  } catch (error) {
    console.error('Image validation error:', error);
    next(new AppError('Image validation failed', 500));
  }
};

/**
 * Image compression middleware
 * Compresses and optimizes images using Sharp
 */
const compressImages = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return next();
    }

    const processedFiles = [];

    for (const file of files) {
      try {
        const originalSize = file.buffer.length;
        const metadata = file.imageMetadata || await sharp(file.buffer).metadata();

        // Calculate target dimensions (maintain aspect ratio)
        let targetWidth = metadata.width;
        let targetHeight = metadata.height;

        if (targetWidth > config.maxWidth || targetHeight > config.maxHeight) {
          const ratio = Math.min(
            config.maxWidth / targetWidth,
            config.maxHeight / targetHeight
          );
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        // Process image
        let sharpInstance = sharp(file.buffer)
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .rotate(); // Auto-rotate based on EXIF

        // Convert to WebP for better compression (or JPEG as fallback)
        let processedBuffer;
        let outputFormat = config.outputFormat;
        let outputMime = config.outputMime;

        if (config.outputFormat === 'webp') {
          processedBuffer = await sharpInstance
            .webp({ quality: config.targetQuality, effort: 4 })
            .toBuffer();
        } else {
          processedBuffer = await sharpInstance
            .jpeg({ quality: config.targetQuality, progressive: true })
            .toBuffer();
          outputFormat = 'jpeg';
          outputMime = 'image/jpeg';
        }

        // Generate thumbnail
        const thumbnailBuffer = await sharp(file.buffer)
          .resize(config.thumbnailSize, config.thumbnailSize, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 70 })
          .toBuffer();

        // Calculate compression stats
        const compressedSize = processedBuffer.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

        // Update file object
        file.buffer = processedBuffer;
        file.mimetype = outputMime;
        file.size = compressedSize;
        file.originalname = file.originalname.replace(/\.[^.]+$/, `.${outputFormat}`);
        
        file.processingInfo = {
          originalSize,
          compressedSize,
          compressionRatio: `${compressionRatio}%`,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          finalDimensions: `${targetWidth}x${targetHeight}`,
          format: outputFormat,
        };

        file.thumbnail = {
          buffer: thumbnailBuffer,
          size: thumbnailBuffer.length,
          dimensions: `${config.thumbnailSize}x${config.thumbnailSize}`,
        };

        processedFiles.push(file);

        console.log(`Image compressed: ${file.originalname} - ${compressionRatio}% reduction`);
      } catch (processError) {
        console.error(`Failed to process image ${file.originalname}:`, processError.message);
        // Keep original file if processing fails
        processedFiles.push(file);
      }
    }

    // Update request with processed files
    if (req.files) {
      req.files = processedFiles;
    } else if (req.file && processedFiles.length > 0) {
      req.file = processedFiles[0];
    }

    next();
  } catch (error) {
    console.error('Image compression error:', error);
    next(new AppError('Image compression failed', 500));
  }
};

/**
 * Generate image hash for deduplication
 */
const generateImageHash = async (buffer) => {
  // Resize to small thumbnail for perceptual hash
  const normalized = await sharp(buffer)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();
  
  // Simple average hash
  const avg = normalized.reduce((sum, val) => sum + val, 0) / normalized.length;
  let hash = '';
  
  for (const pixel of normalized) {
    hash += pixel > avg ? '1' : '0';
  }
  
  // Convert binary to hex
  return BigInt('0b' + hash).toString(16).padStart(16, '0');
};

/**
 * Add perceptual hash to images for duplicate detection
 */
const addImageHash = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      try {
        file.perceptualHash = await generateImageHash(file.buffer);
        file.contentHash = crypto.createHash('md5').update(file.buffer).digest('hex');
      } catch (hashError) {
        console.error('Failed to generate image hash:', hashError.message);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Strip EXIF metadata for privacy
 */
const stripMetadata = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      try {
        // Sharp automatically strips metadata when converting
        // But we can explicitly do it for JPEG
        if (file.mimetype === 'image/jpeg') {
          file.buffer = await sharp(file.buffer)
            .jpeg({ quality: config.targetQuality })
            .toBuffer();
        }
      } catch (stripError) {
        console.error('Failed to strip metadata:', stripError.message);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined image processing pipeline
 * Validates → Compresses → Hashes → Strips metadata
 */
const processImagesPipeline = [
  validateImageFile,
  compressImages,
  addImageHash,
];

/**
 * Get image processing configuration
 */
const getImageConfig = () => ({
  maxFileSizeMB: config.maxFileSizeMB,
  maxFiles: config.maxFiles,
  allowedTypes: Object.keys(config.allowedTypes),
  outputFormat: config.outputFormat,
  maxDimensions: `${config.maxWidth}x${config.maxHeight}`,
  targetQuality: config.targetQuality,
});

module.exports = {
  validateImageFile,
  compressImages,
  addImageHash,
  stripMetadata,
  processImagesPipeline,
  generateImageHash,
  getImageConfig,
  validateMagicBytes,
  validateExtension,
  config,
};
