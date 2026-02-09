const cron = require('node-cron');
const mongoose = require('mongoose');
const { User, Complaint, AuditLog, WhatsAppSession } = require('../models');
const cloudinaryService = require('./cloudinaryService');

/**
 * Data Retention Service - GDPR-like PII Protection
 * 
 * Handles:
 * - Automatic anonymization of old data
 * - User data export (Right to Data Portability)
 * - User data deletion (Right to Erasure)
 * - Data retention policy enforcement
 * - Audit logging for compliance
 */
class DataRetentionService {
  constructor() {
    this.retentionPolicies = {
      // Complaint data retention
      complaints: {
        activeRetentionDays: 365 * 2, // 2 years active
        archiveRetentionDays: 365 * 5, // 5 years archived
        anonymizeAfterDays: 365 * 3, // Anonymize PII after 3 years
      },
      // User account data
      users: {
        inactiveAccountDays: 365 * 2, // 2 years inactive
        deletedAccountRetentionDays: 30, // 30 days after deletion request
      },
      // Session and temporary data
      sessions: {
        whatsappSessionDays: 90, // 90 days
        auditLogDays: 365 * 2, // 2 years
      },
      // Logs and analytics
      logs: {
        accessLogDays: 90, // 90 days
        errorLogDays: 180, // 6 months
      },
    };

    this.cronJob = null;
  }

  /**
   * Initialize the data retention cron job
   * Runs daily at 2 AM
   */
  initialize() {
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      console.log('[DataRetention] Running daily data retention job...');
      await this.runRetentionJob();
    }, {
      scheduled: true,
      timezone: 'Asia/Karachi',
    });

    console.log('✅ Data Retention Service initialized');
    return this;
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Data Retention Service stopped');
    }
  }

  /**
   * Main retention job - runs all retention tasks
   */
  async runRetentionJob() {
    const results = {
      anonymizedComplaints: 0,
      deletedSessions: 0,
      archivedLogs: 0,
      errors: [],
    };

    try {
      // Anonymize old complaint PII
      results.anonymizedComplaints = await this.anonymizeOldComplaints();
      
      // Clean up old sessions
      results.deletedSessions = await this.cleanupOldSessions();
      
      // Archive old audit logs
      results.archivedLogs = await this.archiveOldAuditLogs();
      
      // Process pending deletion requests
      await this.processPendingDeletions();
      
      console.log('[DataRetention] Job completed:', results);
    } catch (error) {
      console.error('[DataRetention] Job failed:', error.message);
      results.errors.push(error.message);
    }

    // Log the retention job execution
    await this.logRetentionActivity('retention_job_completed', results);

    return results;
  }

  // ========== ANONYMIZATION ==========

  /**
   * Anonymize PII in old complaints
   */
  async anonymizeOldComplaints() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.complaints.anonymizeAfterDays);

    const result = await Complaint.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        'status.current': { $in: ['closed', 'citizen_feedback', 'rejected'] },
        'metadata.anonymized': { $ne: true },
      },
      {
        $set: {
          'citizenInfo.name': 'ANONYMIZED',
          'citizenInfo.email': 'anonymized@civiclens.local',
          'metadata.anonymized': true,
          'metadata.anonymizedAt': new Date(),
        },
        $unset: {
          'citizenInfo.phone': 1,
          'metadata.ipAddress': 1,
          'metadata.userAgent': 1,
        },
      }
    );

    console.log(`[DataRetention] Anonymized ${result.modifiedCount} old complaints`);
    return result.modifiedCount;
  }

  /**
   * Clean up old WhatsApp sessions
   */
  async cleanupOldSessions() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.sessions.whatsappSessionDays);

    const result = await WhatsAppSession.deleteMany({
      updatedAt: { $lt: cutoffDate },
      state: { $in: ['completed', 'abandoned', 'error'] },
    });

    console.log(`[DataRetention] Deleted ${result.deletedCount} old WhatsApp sessions`);
    return result.deletedCount;
  }

  /**
   * Archive old audit logs
   */
  async archiveOldAuditLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.sessions.auditLogDays);

    // Mark old logs as archived (actual archival could be to cold storage)
    const result = await AuditLog.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        archived: { $ne: true },
      },
      {
        $set: {
          archived: true,
          archivedAt: new Date(),
        },
      }
    );

    console.log(`[DataRetention] Archived ${result.modifiedCount} old audit logs`);
    return result.modifiedCount;
  }

  // ========== USER DATA RIGHTS ==========

  /**
   * Export all user data (GDPR Article 20 - Data Portability)
   * @param {string} userId - User ID
   * @returns {Object} Complete user data export
   */
  async exportUserData(userId) {
    const user = await User.findById(userId)
      .select('-password -refreshToken -verificationToken -passwordResetToken')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    // Get all complaints by user
    const complaints = await Complaint.find({
      $or: [
        { citizenUser: userId },
        { 'citizenInfo.userId': userId },
      ],
    })
    .select('-metadata.ipAddress -metadata.userAgent')
    .lean();

    // Get audit logs related to user
    const auditLogs = await AuditLog.find({
      $or: [
        { userId },
        { targetUserId: userId },
      ],
    }).lean();

    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        profile: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        preferences: {
          notifications: user.notifications,
        },
        statistics: user.stats,
      },
      complaints: complaints.map(c => ({
        id: c.complaintId,
        description: c.description,
        category: c.category,
        location: {
          address: c.location?.address,
          area: c.location?.area,
          // Coordinates redacted for privacy
        },
        status: c.status,
        createdAt: c.createdAt,
        feedback: c.citizenFeedback,
      })),
      activityLogs: auditLogs.map(log => ({
        action: log.action,
        timestamp: log.createdAt,
        details: log.details,
      })),
      dataCategories: [
        'Personal Information',
        'Contact Information',
        'Complaint Records',
        'Activity Logs',
      ],
    };

    // Log data export
    await this.logRetentionActivity('user_data_export', {
      userId,
      exportedAt: new Date(),
      dataCategories: exportData.dataCategories,
    });

    return exportData;
  }

  /**
   * Delete user data (GDPR Article 17 - Right to Erasure)
   * @param {string} userId - User ID
   * @param {string} requestedBy - ID of user who requested deletion
   * @param {string} reason - Reason for deletion
   */
  async requestUserDeletion(userId, requestedBy, reason = '') {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deletion of officials with active responsibilities
    if (['uc_chairman', 'town_chairman', 'mayor'].includes(user.role)) {
      throw new Error('Officials must be removed from their position before deletion');
    }

    // Schedule deletion
    user.deletionRequested = true;
    user.deletionRequestedAt = new Date();
    user.deletionRequestedBy = requestedBy;
    user.deletionReason = reason;
    user.scheduledDeletionDate = new Date(
      Date.now() + this.retentionPolicies.users.deletedAccountRetentionDays * 24 * 60 * 60 * 1000
    );
    
    await user.save();

    // Log deletion request
    await this.logRetentionActivity('deletion_requested', {
      userId,
      requestedBy,
      reason,
      scheduledDate: user.scheduledDeletionDate,
    });

    return {
      success: true,
      scheduledDeletionDate: user.scheduledDeletionDate,
      message: `Account scheduled for deletion on ${user.scheduledDeletionDate.toISOString()}`,
    };
  }

  /**
   * Process pending user deletions
   */
  async processPendingDeletions() {
    const now = new Date();

    const usersToDelete = await User.find({
      deletionRequested: true,
      scheduledDeletionDate: { $lte: now },
    });

    for (const user of usersToDelete) {
      try {
        await this.executeUserDeletion(user);
      } catch (error) {
        console.error(`[DataRetention] Failed to delete user ${user._id}:`, error.message);
      }
    }

    return usersToDelete.length;
  }

  /**
   * Execute actual user deletion
   */
  async executeUserDeletion(user) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Anonymize user's complaints instead of deleting
      await Complaint.updateMany(
        { citizenUser: user._id },
        {
          $set: {
            'citizenInfo.name': 'DELETED_USER',
            'citizenInfo.email': 'deleted@civiclens.local',
            'metadata.userDeleted': true,
            'metadata.userDeletedAt': new Date(),
          },
          $unset: {
            citizenUser: 1,
            'citizenInfo.phone': 1,
            'citizenInfo.userId': 1,
          },
        },
        { session }
      );

      // Delete user's avatar from Cloudinary
      if (user.avatar?.publicId) {
        await cloudinaryService.deleteImage(user.avatar.publicId);
      }

      // Anonymize audit logs
      await AuditLog.updateMany(
        { userId: user._id },
        {
          $set: {
            'userInfo.name': 'DELETED_USER',
            'userInfo.email': 'deleted@civiclens.local',
          },
        },
        { session }
      );

      // Delete the user
      await User.findByIdAndDelete(user._id, { session });

      await session.commitTransaction();

      // Log deletion completion
      await this.logRetentionActivity('user_deleted', {
        userId: user._id,
        email: user.email, // Log for audit before it's gone
        deletedAt: new Date(),
      });

      console.log(`[DataRetention] User ${user._id} deleted successfully`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletionRequest(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.deletionRequested) {
      throw new Error('No deletion request found');
    }

    user.deletionRequested = false;
    user.deletionRequestedAt = undefined;
    user.deletionRequestedBy = undefined;
    user.deletionReason = undefined;
    user.scheduledDeletionDate = undefined;

    await user.save();

    await this.logRetentionActivity('deletion_cancelled', { userId });

    return { success: true, message: 'Deletion request cancelled' };
  }

  // ========== CONSENT MANAGEMENT ==========

  /**
   * Record user consent
   */
  async recordConsent(userId, consentType, granted, source = 'web') {
    await User.findByIdAndUpdate(userId, {
      $push: {
        consentHistory: {
          type: consentType,
          granted,
          timestamp: new Date(),
          source,
          ipAddress: null, // Set from request if needed
        },
      },
      $set: {
        [`consents.${consentType}`]: granted,
      },
    });

    await this.logRetentionActivity('consent_updated', {
      userId,
      consentType,
      granted,
      source,
    });
  }

  /**
   * Get user consent status
   */
  async getConsentStatus(userId) {
    const user = await User.findById(userId).select('consents consentHistory');
    return {
      currentConsents: user?.consents || {},
      history: user?.consentHistory || [],
    };
  }

  // ========== REPORTING ==========

  /**
   * Generate data retention compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    const report = {
      period: { start: startDate, end: endDate },
      generatedAt: new Date(),
      statistics: {},
    };

    // Data export requests
    const exportRequests = await AuditLog.countDocuments({
      action: 'user_data_export',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Deletion requests
    const deletionRequests = await AuditLog.countDocuments({
      action: 'deletion_requested',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Completed deletions
    const completedDeletions = await AuditLog.countDocuments({
      action: 'user_deleted',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Anonymized records
    const anonymizedRecords = await Complaint.countDocuments({
      'metadata.anonymizedAt': { $gte: startDate, $lte: endDate },
    });

    report.statistics = {
      dataExportRequests: exportRequests,
      deletionRequests,
      completedDeletions,
      anonymizedRecords,
      cancelledDeletions: deletionRequests - completedDeletions,
    };

    // Average response times
    const exportLogs = await AuditLog.find({
      action: 'user_data_export',
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    if (exportLogs.length > 0) {
      report.statistics.avgExportResponseTime = 'Immediate (automated)';
    }

    return report;
  }

  // ========== UTILITIES ==========

  /**
   * Log retention activity for audit
   */
  async logRetentionActivity(action, details) {
    try {
      await AuditLog.create({
        action,
        category: 'data_retention',
        details,
        timestamp: new Date(),
        system: true,
      });
    } catch (error) {
      console.error('[DataRetention] Failed to log activity:', error.message);
    }
  }

  /**
   * Get retention policy summary
   */
  getRetentionPolicies() {
    return this.retentionPolicies;
  }

  /**
   * Check if data should be anonymized
   */
  shouldAnonymize(createdAt) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.complaints.anonymizeAfterDays);
    return new Date(createdAt) < cutoffDate;
  }
}

// Export singleton instance
module.exports = new DataRetentionService();
