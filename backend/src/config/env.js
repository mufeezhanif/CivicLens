const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Environment configuration object
 * Centralizes all environment variables with validation and defaults
 */
const env = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/civiclens',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Email (SMTP)
  email: {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  
  // Frontend URL (for email links)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  // GROQ / AI
  groqApiKey: process.env.GROQ_API_KEY,
  ai: {
    classificationEnabled: process.env.AI_CLASSIFICATION_ENABLED !== 'false',
    fallbackToLocal: process.env.AI_FALLBACK_TO_LOCAL !== 'false',
  },

  // Speech / Whisper
  whisper: {
    binPath: process.env.WHISPER_BIN_PATH,
    modelPath: process.env.WHISPER_MODEL_PATH,
    maxDuration: parseInt(process.env.SPEECH_MAX_DURATION, 10) || 30,
    simulationMode: process.env.SPEECH_SIMULATION_MODE === 'true',
  },

  // WhatsApp
  whatsapp: {
    authDir: process.env.WHATSAPP_AUTH_DIR || './whatsapp-auth',
    enabled: process.env.WHATSAPP_ENABLED !== 'false',
  },

  // Location web link fallback
  enableLocationWebLink: process.env.ENABLE_LOCATION_WEB_LINK === 'true',
  
  // Helper methods
  isDevelopment: () => env.nodeEnv === 'development',
  isProduction: () => env.nodeEnv === 'production',
  isTest: () => env.nodeEnv === 'test',
};

/**
 * Validate required environment variables
 */
const validateEnv = () => {
  const required = ['MONGODB_URI'];
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using default values where possible.');
  }
  
  // Warn about Cloudinary if trying to use image features
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    console.warn('Warning: Cloudinary credentials not configured. Image uploads will be stored locally.');
  }

  // Warn about SMTP email config
  if (!env.email.smtp.host || !env.email.smtp.user || !env.email.smtp.pass) {
    console.warn('Warning: SMTP credentials not configured. Outgoing email will be disabled.');
  }
};

// Validate on import
validateEnv();

module.exports = env;
