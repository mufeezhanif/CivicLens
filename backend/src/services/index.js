const complaintService = require('./complaintService');
const geoService = require('./geoService');
const cloudinaryService = require('./cloudinaryService');
const classificationService = require('./classificationService');
const duplicateService = require('./duplicateService');
const severityService = require('./severityService');
const speechService = require('./speechService');
const sessionService = require('./sessionService');
const whatsappService = require('./whatsappService');
const whatsappConversationService = require('./whatsappConversationService');
const authService = require('./authService');
const ucAssignmentService = require('./ucAssignmentService');
const invitationService = require('./invitationService');

// New services
const websocketService = require('./websocketService');
const pushNotificationService = require('./pushNotificationService');
const escalationService = require('./escalationService');
const dataRetentionService = require('./dataRetentionService');
const redisService = require('./redisService');

module.exports = {
  complaintService,
  geoService,
  cloudinaryService,
  classificationService,
  duplicateService,
  severityService,
  speechService,
  sessionService,
  whatsappService,
  whatsappConversationService,
  authService,
  ucAssignmentService,
  invitationService,
  // New services
  websocketService,
  pushNotificationService,
  escalationService,
  dataRetentionService,
  redisService,
};
