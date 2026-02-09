const admin = require('firebase-admin');
const env = require('../config/env');
const { User } = require('../models');

/**
 * Push Notification Service using Firebase Cloud Messaging (FCM)
 * Handles push notifications for web and mobile clients
 */
class PushNotificationService {
  constructor() {
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    try {
      // Check if Firebase credentials are available
      const serviceAccount = env.firebase?.serviceAccount || process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (serviceAccount) {
        let credentials;
        
        if (typeof serviceAccount === 'string') {
          // JSON string from environment variable
          credentials = JSON.parse(serviceAccount);
        } else {
          credentials = serviceAccount;
        }

        admin.initializeApp({
          credential: admin.credential.cert(credentials),
        });
        
        this.isConfigured = true;
        console.log('✅ Firebase Admin SDK initialized');
      } else {
        console.warn('⚠️ Firebase credentials not configured. Push notifications disabled.');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send push notification to a single device
   * @param {string} fcmToken - FCM device token
   * @param {Object} notification - Notification content
   * @param {Object} data - Additional data payload
   */
  async sendToDevice(fcmToken, notification, data = {}) {
    if (!this.isConfigured) {
      console.log('[Push] Firebase not configured. Notification skipped:', notification.title);
      return { success: false, reason: 'Firebase not configured' };
    }

    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: this.stringifyData(data),
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: notification.requireInteraction || false,
            actions: notification.actions || [],
          },
          fcmOptions: {
            link: notification.link || '/',
          },
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'notification_icon',
            color: '#4F46E5',
            clickAction: 'OPEN_ACTIVITY',
            channelId: notification.channelId || 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: notification.badge || 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`[Push] Notification sent: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('[Push] Send failed:', error.message);
      
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        await this.removeInvalidToken(fcmToken);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {string[]} fcmTokens - Array of FCM tokens
   * @param {Object} notification - Notification content
   * @param {Object} data - Additional data payload
   */
  async sendToMultipleDevices(fcmTokens, notification, data = {}) {
    if (!this.isConfigured || !fcmTokens.length) {
      return { success: false, reason: 'Firebase not configured or no tokens' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: this.stringifyData(data),
        tokens: fcmTokens,
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((res, idx) => {
          if (!res.success && res.error?.code?.includes('registration-token')) {
            invalidTokens.push(fcmTokens[idx]);
          }
        });
        
        if (invalidTokens.length > 0) {
          await this.removeInvalidTokens(invalidTokens);
        }
      }

      console.log(`[Push] Multicast sent: ${response.successCount}/${fcmTokens.length} succeeded`);
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('[Push] Multicast failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to a user (all their registered devices)
   * @param {string} userId - User ID
   * @param {Object} notification - Notification content
   * @param {Object} data - Additional data payload
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      const user = await User.findById(userId).select('fcmTokens notifications');
      
      if (!user || !user.notifications?.push) {
        return { success: false, reason: 'User not found or push disabled' };
      }

      const fcmTokens = user.fcmTokens || [];
      
      if (fcmTokens.length === 0) {
        return { success: false, reason: 'No FCM tokens registered' };
      }

      return await this.sendToMultipleDevices(fcmTokens, notification, data);
    } catch (error) {
      console.error('[Push] Send to user failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to users by role
   * @param {string} role - User role
   * @param {Object} notification - Notification content
   * @param {Object} data - Additional data payload
   * @param {Object} filters - Additional filters (ucId, townId, cityId)
   */
  async sendToRole(role, notification, data = {}, filters = {}) {
    try {
      const query = {
        role,
        isActive: true,
        'notifications.push': true,
        fcmTokens: { $exists: true, $ne: [] },
      };

      if (filters.ucId) query.ucId = filters.ucId;
      if (filters.townId) query.townId = filters.townId;
      if (filters.cityId) query.cityId = filters.cityId;

      const users = await User.find(query).select('fcmTokens');
      
      const allTokens = users.flatMap(u => u.fcmTokens || []);
      
      if (allTokens.length === 0) {
        return { success: false, reason: 'No FCM tokens for role' };
      }

      // FCM has a limit of 500 tokens per multicast
      const results = [];
      for (let i = 0; i < allTokens.length; i += 500) {
        const batch = allTokens.slice(i, i + 500);
        const result = await this.sendToMultipleDevices(batch, notification, data);
        results.push(result);
      }

      const totalSuccess = results.reduce((sum, r) => sum + (r.successCount || 0), 0);
      const totalFailure = results.reduce((sum, r) => sum + (r.failureCount || 0), 0);

      return {
        success: true,
        successCount: totalSuccess,
        failureCount: totalFailure,
      };
    } catch (error) {
      console.error('[Push] Send to role failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to topic subscribers
   * @param {string} topic - FCM topic name
   * @param {Object} notification - Notification content
   * @param {Object} data - Additional data payload
   */
  async sendToTopic(topic, notification, data = {}) {
    if (!this.isConfigured) {
      return { success: false, reason: 'Firebase not configured' };
    }

    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: this.stringifyData(data),
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`[Push] Topic notification sent: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('[Push] Topic send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== NOTIFICATION TEMPLATES ==========

  /**
   * Notify citizen about complaint status update
   */
  async notifyComplaintStatusUpdate(complaint, newStatus, remarks = '') {
    const statusMessages = {
      acknowledged: 'Your complaint has been acknowledged and is being reviewed.',
      in_progress: 'Work has started on your complaint.',
      resolved: 'Your complaint has been resolved. Please provide feedback.',
      closed: 'Your complaint has been closed.',
      rejected: `Your complaint was rejected${remarks ? ': ' + remarks : '.'}`,
    };

    const notification = {
      title: `Complaint ${newStatus.replace('_', ' ').toUpperCase()}`,
      body: statusMessages[newStatus] || `Status updated to: ${newStatus}`,
      link: `/complaints/${complaint._id}`,
      requireInteraction: newStatus === 'resolved',
    };

    const data = {
      type: 'complaint_status',
      complaintId: complaint.complaintId,
      status: newStatus,
    };

    if (complaint.citizenUser) {
      return await this.sendToUser(complaint.citizenUser.toString(), notification, data);
    }
    
    return { success: false, reason: 'No citizen user linked' };
  }

  /**
   * Notify officials about new complaint
   */
  async notifyNewComplaint(complaint) {
    const notification = {
      title: 'New Complaint Received',
      body: `${complaint.category.primary}: ${complaint.description.substring(0, 100)}...`,
      link: `/dashboard/complaints/${complaint._id}`,
    };

    const data = {
      type: 'new_complaint',
      complaintId: complaint.complaintId,
      category: complaint.category.primary,
      severity: complaint.severity?.priority || 'medium',
    };

    // Notify UC Chairman
    if (complaint.ucId) {
      await this.sendToRole('uc_chairman', notification, data, { ucId: complaint.ucId });
    }

    return { success: true };
  }

  /**
   * Notify about SLA breach
   */
  async notifySLABreach(complaint) {
    const notification = {
      title: '⚠️ SLA Breach Alert',
      body: `Complaint ${complaint.complaintId} has breached SLA deadline!`,
      link: `/dashboard/complaints/${complaint._id}`,
      requireInteraction: true,
    };

    const data = {
      type: 'sla_breach',
      complaintId: complaint.complaintId,
      category: complaint.category.primary,
    };

    // Notify UC Chairman
    if (complaint.ucId) {
      await this.sendToRole('uc_chairman', notification, data, { ucId: complaint.ucId });
    }

    // Notify Town Chairman
    if (complaint.townId) {
      await this.sendToRole('town_chairman', notification, data, { townId: complaint.townId });
    }

    return { success: true };
  }

  /**
   * Notify about complaint escalation
   */
  async notifyEscalation(complaint, escalatedTo) {
    const notification = {
      title: '📈 Complaint Escalated',
      body: `Complaint ${complaint.complaintId} has been escalated to ${escalatedTo}.`,
      link: `/dashboard/complaints/${complaint._id}`,
      requireInteraction: true,
    };

    const data = {
      type: 'escalation',
      complaintId: complaint.complaintId,
      escalatedTo,
    };

    if (escalatedTo === 'town' && complaint.townId) {
      await this.sendToRole('town_chairman', notification, data, { townId: complaint.townId });
    } else if (escalatedTo === 'city' && complaint.cityId) {
      await this.sendToRole('mayor', notification, data, { cityId: complaint.cityId });
    }

    return { success: true };
  }

  // ========== TOKEN MANAGEMENT ==========

  /**
   * Register FCM token for a user
   */
  async registerToken(userId, fcmToken, deviceInfo = {}) {
    try {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { fcmTokens: fcmToken },
        $set: { lastFcmTokenUpdate: new Date() },
      });

      console.log(`[Push] Token registered for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[Push] Token registration failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister FCM token
   */
  async unregisterToken(userId, fcmToken) {
    try {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: fcmToken },
      });

      console.log(`[Push] Token unregistered for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[Push] Token unregistration failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove invalid token from database
   */
  async removeInvalidToken(fcmToken) {
    try {
      await User.updateMany(
        { fcmTokens: fcmToken },
        { $pull: { fcmTokens: fcmToken } }
      );
      console.log(`[Push] Removed invalid token: ${fcmToken.substring(0, 20)}...`);
    } catch (error) {
      console.error('[Push] Failed to remove invalid token:', error.message);
    }
  }

  /**
   * Remove multiple invalid tokens
   */
  async removeInvalidTokens(fcmTokens) {
    for (const token of fcmTokens) {
      await this.removeInvalidToken(token);
    }
  }

  /**
   * Subscribe user to topic
   */
  async subscribeToTopic(fcmTokens, topic) {
    if (!this.isConfigured || !fcmTokens.length) return;

    try {
      await admin.messaging().subscribeToTopic(fcmTokens, topic);
      console.log(`[Push] Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('[Push] Topic subscription failed:', error.message);
    }
  }

  /**
   * Unsubscribe user from topic
   */
  async unsubscribeFromTopic(fcmTokens, topic) {
    if (!this.isConfigured || !fcmTokens.length) return;

    try {
      await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
      console.log(`[Push] Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error('[Push] Topic unsubscription failed:', error.message);
    }
  }

  // ========== HELPERS ==========

  /**
   * Convert data object to string values (FCM requirement)
   */
  stringifyData(data) {
    const stringified = {};
    for (const [key, value] of Object.entries(data)) {
      stringified[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringified;
  }

  /**
   * Check if service is configured
   */
  isAvailable() {
    return this.isConfigured;
  }
}

// Export singleton instance
module.exports = new PushNotificationService();
