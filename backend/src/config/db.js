const mongoose = require('mongoose');

/**
 * MongoDB Connection Pool Configuration
 * Optimized for production workloads
 */
const connectionOptions = {
  // Connection Pool Settings (conservative for Atlas free tier)
  maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 5,
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 1,
  maxIdleTimeMS: 300000, // Close idle connections after 5 minutes (Atlas-friendly)
  
  // Timeouts
  serverSelectionTimeoutMS: 10000, // Timeout for server selection
  socketTimeoutMS: 60000, // Socket timeout
  connectTimeoutMS: 15000, // Initial connection timeout
  
  // Write Concern
  w: 'majority', // Wait for majority of replicas
  wtimeoutMS: 10000, // Write concern timeout
  
  // Read Preference
  readPreference: 'primaryPreferred', // Read from primary, fallback to secondary
  
  // Retry Logic
  retryWrites: true,
  retryReads: true,
  
  // Compression
  compressors: ['zlib'],
  
  // Heartbeat (30s is gentler on Atlas free tier)
  heartbeatFrequencyMS: 30000,
  
  // Auto Index (disable in production for better startup)
  autoIndex: process.env.NODE_ENV !== 'production',
};

/**
 * Connection state tracking
 */
let connectionAttempts = 0;
const maxRetries = 5;
const retryDelay = 5000;

/**
 * Connect to MongoDB database with retry logic
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    connectionAttempts++;
    console.log(`Connecting to MongoDB (attempt ${connectionAttempts}/${maxRetries})...`);
    
    const conn = await mongoose.connect(mongoUri, connectionOptions);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Pool Size: ${connectionOptions.maxPoolSize}`);
    
    // Reset connection attempts on success
    connectionAttempts = 0;
    
    // Set up connection event handlers
    setupConnectionHandlers();

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    
    if (connectionAttempts < maxRetries) {
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDB();
    } else {
      console.error('Max connection attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

/**
 * Setup connection event handlers
 */
const setupConnectionHandlers = () => {
  const connection = mongoose.connection;

  connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
  });

  connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  connection.on('close', () => {
    console.log('MongoDB connection closed');
  });

  // Monitor connection pool
  if (process.env.NODE_ENV === 'development') {
    connection.on('connected', () => {
      console.log('MongoDB connection established');
    });
  }
};

/**
 * Disconnect from MongoDB gracefully
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB disconnected gracefully');
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Get connection pool statistics
 */
const getPoolStats = () => {
  const connection = mongoose.connection;
  
  if (!connection || connection.readyState !== 1) {
    return { connected: false };
  }

  return {
    connected: true,
    readyState: connection.readyState,
    host: connection.host,
    port: connection.port,
    name: connection.name,
    poolSize: connectionOptions.maxPoolSize,
    // Note: Detailed pool stats require native driver access
  };
};

/**
 * Health check for MongoDB connection
 */
const healthCheck = async () => {
  try {
    const connection = mongoose.connection;
    
    if (connection.readyState !== 1) {
      return { healthy: false, status: 'disconnected' };
    }

    // Ping the database
    await connection.db.admin().ping();
    
    return {
      healthy: true,
      status: 'connected',
      host: connection.host,
      database: connection.name,
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      error: error.message,
    };
  }
};

/**
 * Create indexes for all models
 * Should be called after connection in production
 */
const ensureIndexes = async () => {
  try {
    const modelNames = mongoose.modelNames();
    
    for (const modelName of modelNames) {
      const model = mongoose.model(modelName);
      await model.ensureIndexes();
    }
    
    console.log('✅ All indexes ensured');
  } catch (error) {
    console.error('Error ensuring indexes:', error.message);
  }
};

module.exports = { 
  connectDB, 
  disconnectDB,
  getPoolStats,
  healthCheck,
  ensureIndexes,
  connectionOptions,
};
