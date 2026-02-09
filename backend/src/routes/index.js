const express = require('express');
const router = express.Router();

const complaintRoutes = require('./complaintRoutes');
const categoryRoutes = require('./categoryRoutes');
const voiceRoutes = require('./voiceRoutes');
const authRoutes = require('./authRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const hierarchyRoutes = require('./hierarchy');
const invitationRoutes = require('./invitation');
const analyticsRoutes = require('./analytics');
const territoryRoutes = require('./territoryRoutes');
const chatbotRoutes = require('./chatbotRoutes');
const chatRoutes = require('./chatRoutes');

/**
 * API Routes
 * Base path: /api/v1
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CivicLens API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Auth routes (no prefix needed, already /auth)
router.use('/auth', authRoutes);

// Complaint routes
router.use('/complaints', complaintRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Voice routes
router.use('/voice', voiceRoutes);

// WhatsApp routes
router.use('/whatsapp', whatsappRoutes);
// Hierarchy routes (City → Town → UC management)
router.use('/hierarchy', hierarchyRoutes);

// Invitation routes (Admin role invitations)
router.use('/invitations', invitationRoutes);

// Analytics routes (hierarchy-based reporting)
router.use('/analytics', analyticsRoutes);

// Territory routes (for map visualization and admin management)
router.use('/territories', territoryRoutes);

// Chatbot routes (AI assistant)
router.use('/chatbot', chatbotRoutes);

// Chat routes (Real-time messaging)
router.use('/chat', chatRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CivicLens API v1.0.0',
    health: '/api/v1/health',
  });
});

module.exports = router;
