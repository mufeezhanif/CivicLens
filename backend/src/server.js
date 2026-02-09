const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB, ensureIndexes } = require('./config/db');
const { Category } = require('./models');

// Services
const websocketService = require('./services/websocketService');
const redisService = require('./services/redisService');
const escalationService = require('./services/escalationService');
const dataRetentionService = require('./services/dataRetentionService');

/**
 * Server startup and configuration
 */

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected');

    // Initialize Redis cache
    await redisService.initialize();
    console.log('✅ Redis cache initialized');

    // Seed default categories if needed
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      await Category.seedDefaults();
      console.log('✅ Default categories seeded');
    }

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server
    websocketService.initialize(server);
    console.log('✅ WebSocket server initialized');

    // Initialize escalation service (cron job)
    escalationService.initialize();
    console.log('✅ SLA Escalation service initialized');

    // Initialize data retention service (cron job)
    dataRetentionService.initialize();
    console.log('✅ Data Retention service initialized');

    // Ensure database indexes in production
    if (env.isProduction()) {
      await ensureIndexes();
    }

    // Make services available globally
    app.set('websocket', websocketService);
    app.set('redis', redisService);

    // Start listening
    server.listen(env.port, () => {
      console.log(`\n  CivicLens API running on http://localhost:${env.port}/api/v1 [${env.nodeEnv}]\n`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      gracefulShutdown(server, 'unhandledRejection');
    });

    // Handle SIGTERM signal (graceful shutdown)
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      gracefulShutdown(server, 'SIGTERM');
    });

    // Handle SIGINT signal (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('\n👋 SIGINT RECEIVED. Shutting down gracefully');
      gracefulShutdown(server, 'SIGINT');
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (server, signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // Stop cron jobs
      escalationService.stop();
      dataRetentionService.stop();
      console.log('Cron jobs stopped');

      // Close Redis connection
      await redisService.disconnect();
      console.log('Redis disconnected');

      // Close database connection
      await disconnectDB();
      console.log('Database disconnected');

      console.log('💤 Process terminated gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start the server
startServer();

module.exports = { startServer };
