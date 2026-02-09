const mongoose = require('mongoose');

/**
 * AuditLog Schema
 * Immutable log of all system actions for compliance and debugging
 * No updates or deletes allowed - append-only collection
 */
const auditLogSchema = new mongoose.Schema({
  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  // User details snapshot (in case user is deleted)
  userSnapshot: {
    name: String,
    email: String,
    role: String,
  },
  // Action type
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      // Authentication
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      
      // User management
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_DEACTIVATE',
      'USER_REACTIVATE',
      'ROLE_CHANGE',
      
      // Invitation
      'INVITATION_CREATE',
      'INVITATION_ACCEPT',
      'INVITATION_REVOKE',
      'INVITATION_RESEND',
      'INVITATION_EXPIRE',
      
      // Complaint lifecycle
      'COMPLAINT_CREATE',
      'COMPLAINT_VIEW',
      'COMPLAINT_UPDATE',
      'COMPLAINT_STATUS_CHANGE',
      'COMPLAINT_ASSIGN',
      'COMPLAINT_REASSIGN',
      'COMPLAINT_FEEDBACK',
      
      // Immutability violations (attempted)
      'IMMUTABLE_FIELD_MODIFY_ATTEMPT',
      
      // Hierarchy management
      'CITY_CREATE',
      'CITY_UPDATE',
      'CITY_DELETE',
      'TOWN_CREATE',
      'TOWN_UPDATE',
      'TOWN_DELETE',
      'UC_CREATE',
      'UC_UPDATE',
      'UC_DELETE',
      
      // Authorization
      'ACCESS_DENIED',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      
      // System
      'SYSTEM_ERROR',
      'SLA_BREACH',
      'DATA_EXPORT',
      'SETTINGS_CHANGE',
    ],
    index: true,
  },
  // Category for filtering
  category: {
    type: String,
    enum: ['auth', 'user', 'invitation', 'complaint', 'hierarchy', 'authorization', 'system'],
    required: true,
    index: true,
  },
  // Resource affected
  resource: {
    type: {
      type: String,
      enum: ['User', 'Complaint', 'Invitation', 'City', 'Town', 'UC', 'Category', 'System'],
    },
    id: mongoose.Schema.Types.ObjectId,
    identifier: String, // Human-readable identifier (e.g., complaintId, email)
  },
  // Old value (for updates)
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  // New value (for creates/updates)
  newValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Specific field changes
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
  }],
  // Status transition (for complaint status changes)
  statusTransition: {
    from: String,
    to: String,
  },
  // Result of the action
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success',
  },
  // Error details if action failed
  error: {
    message: String,
    code: String,
    stack: String,
  },
  // Request metadata
  request: {
    ipAddress: String,
    userAgent: String,
    method: String,
    path: String,
    referer: String,
  },
  // Session information
  session: {
    sessionId: String,
    tokenId: String,
  },
  // Additional context
  context: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Tags for filtering
  tags: [{
    type: String,
    trim: true,
  }],
  // Timestamp with millisecond precision
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'audit_logs',
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1, timestamp: -1 });
auditLogSchema.index({ result: 1, timestamp: -1 });

// TTL index for automatic cleanup (optional - keep logs for 2 years)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

/**
 * Pre-save middleware to set category based on action
 */
auditLogSchema.pre('save', function() {
  if (!this.category) {
    if (this.action.startsWith('LOGIN') || this.action.startsWith('LOGOUT') || 
        this.action.includes('PASSWORD') || this.action.includes('ACCOUNT')) {
      this.category = 'auth';
    } else if (this.action.startsWith('USER') || this.action.includes('ROLE')) {
      this.category = 'user';
    } else if (this.action.startsWith('INVITATION')) {
      this.category = 'invitation';
    } else if (this.action.startsWith('COMPLAINT') || this.action.includes('IMMUTABLE')) {
      this.category = 'complaint';
    } else if (this.action.startsWith('CITY') || this.action.startsWith('TOWN') || this.action.startsWith('UC')) {
      this.category = 'hierarchy';
    } else if (this.action.includes('ACCESS') || this.action.includes('UNAUTHORIZED')) {
      this.category = 'authorization';
    } else {
      this.category = 'system';
    }
  }
});

/**
 * Prevent updates and deletes - logs are immutable
 */
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany'], function() {
  const error = new Error('Audit logs are immutable and cannot be modified or deleted');
  error.code = 'AUDIT_LOG_IMMUTABLE';
  throw error;
});

/**
 * Static method to log an action
 */
auditLogSchema.statics.log = async function(data) {
  try {
    const log = new this({
      userId: data.userId,
      userSnapshot: data.userSnapshot || {},
      action: data.action,
      category: data.category,
      resource: data.resource,
      previousValue: data.previousValue,
      newValue: data.newValue,
      changes: data.changes,
      statusTransition: data.statusTransition,
      result: data.result || 'success',
      error: data.error,
      request: data.request,
      session: data.session,
      context: data.context,
      tags: data.tags,
      timestamp: data.timestamp || new Date(),
    });

    await log.save();
    return log;
  } catch (error) {
    // Don't let logging failures affect the main operation
    console.error('Audit log error:', error);
    return null;
  }
};

/**
 * Static method to log authentication event
 */
auditLogSchema.statics.logAuth = function(action, user, request, result = 'success', error = null) {
  return this.log({
    userId: user?._id,
    userSnapshot: user ? { name: user.name, email: user.email, role: user.role } : {},
    action,
    category: 'auth',
    result,
    error: error ? { message: error.message } : undefined,
    request: {
      ipAddress: request?.ip,
      userAgent: request?.get?.('User-Agent'),
      method: request?.method,
      path: request?.path,
    },
  });
};

/**
 * Static method to log complaint action
 */
auditLogSchema.statics.logComplaint = function(action, complaint, user, request, options = {}) {
  return this.log({
    userId: user?._id,
    userSnapshot: user ? { name: user.name, email: user.email, role: user.role } : {},
    action,
    category: 'complaint',
    resource: {
      type: 'Complaint',
      id: complaint._id,
      identifier: complaint.complaintId,
    },
    previousValue: options.previousValue,
    newValue: options.newValue,
    changes: options.changes,
    statusTransition: options.statusTransition,
    result: options.result || 'success',
    request: {
      ipAddress: request?.ip,
      userAgent: request?.get?.('User-Agent'),
      method: request?.method,
      path: request?.path,
    },
    context: options.context,
  });
};

/**
 * Static method to log user management action
 */
auditLogSchema.statics.logUser = function(action, targetUser, performedBy, request, options = {}) {
  return this.log({
    userId: performedBy?._id,
    userSnapshot: performedBy ? { name: performedBy.name, email: performedBy.email, role: performedBy.role } : {},
    action,
    category: 'user',
    resource: {
      type: 'User',
      id: targetUser._id,
      identifier: targetUser.email,
    },
    previousValue: options.previousValue,
    newValue: options.newValue,
    changes: options.changes,
    result: options.result || 'success',
    request: {
      ipAddress: request?.ip,
      userAgent: request?.get?.('User-Agent'),
      method: request?.method,
      path: request?.path,
    },
  });
};

/**
 * Static method to log access denied
 */
auditLogSchema.statics.logAccessDenied = function(user, request, resource, reason) {
  return this.log({
    userId: user?._id,
    userSnapshot: user ? { name: user.name, email: user.email, role: user.role } : {},
    action: 'ACCESS_DENIED',
    category: 'authorization',
    resource,
    result: 'failure',
    context: { reason },
    request: {
      ipAddress: request?.ip,
      userAgent: request?.get?.('User-Agent'),
      method: request?.method,
      path: request?.path,
    },
    tags: ['security'],
  });
};

/**
 * Static method to query logs with filters
 */
auditLogSchema.statics.query = function(filters = {}, options = {}) {
  const query = {};

  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.category) query.category = filters.category;
  if (filters.resourceType) query['resource.type'] = filters.resourceType;
  if (filters.resourceId) query['resource.id'] = filters.resourceId;
  if (filters.result) query.result = filters.result;
  
  if (filters.from || filters.to) {
    query.timestamp = {};
    if (filters.from) query.timestamp.$gte = new Date(filters.from);
    if (filters.to) query.timestamp.$lte = new Date(filters.to);
  }

  if (filters.tags) {
    query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
  }

  const limit = Math.min(options.limit || 100, 1000);
  const skip = options.skip || 0;

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email role');
};

/**
 * Static method to get summary statistics
 */
auditLogSchema.statics.getSummary = async function(options = {}) {
  const matchStage = {};
  
  if (options.from || options.to) {
    matchStage.timestamp = {};
    if (options.from) matchStage.timestamp.$gte = new Date(options.from);
    if (options.to) matchStage.timestamp.$lte = new Date(options.to);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ],
        byResult: [
          { $group: { _id: '$result', count: { $sum: 1 } } },
        ],
        totalCount: [
          { $count: 'total' },
        ],
        securityEvents: [
          {
            $match: {
              $or: [
                { tags: 'security' },
                { action: { $in: ['ACCESS_DENIED', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'LOGIN_FAILED', 'ACCOUNT_LOCKED'] } },
              ],
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Alias for backward compatibility
AuditLog.logAction = AuditLog.log;

module.exports = AuditLog;
