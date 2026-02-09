const cron = require('node-cron');
const { Complaint, User, UC, Town } = require('../models');
const websocketService = require('./websocketService');
const pushNotificationService = require('./pushNotificationService');
const emailService = require('./emailService');

/**
 * SLA Escalation State Machine
 * Handles automatic escalation of complaints based on SLA breach
 * 
 * Escalation Flow:
 * 1. UC Level (48 hours) → notify UC Chairman
 * 2. Town Level (72 hours) → escalate to Town Chairman  
 * 3. City Level (96 hours) → escalate to Mayor
 * 4. Critical Alert (120 hours) → notify Website Admin
 */
class EscalationService {
  constructor() {
    this.escalationLevels = {
      uc: { hours: 48, nextLevel: 'town', role: 'uc_chairman' },
      town: { hours: 72, nextLevel: 'city', role: 'town_chairman' },
      city: { hours: 96, nextLevel: 'critical', role: 'mayor' },
      critical: { hours: 120, nextLevel: null, role: 'website_admin' },
    };

    this.slaHoursByCategory = {
      Roads: 72,
      Water: 48,
      Garbage: 24,
      Electricity: 24,
      Others: 48,
    };

    this.slaHoursBySeverity = {
      critical: 24,
      high: 36,
      medium: 48,
      low: 72,
    };

    this.cronJob = null;
  }

  /**
   * Initialize the escalation cron job
   * Runs every 15 minutes to check for SLA breaches
   */
  initialize() {
    // Run every 15 minutes
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      console.log('[Escalation] Running SLA check...');
      await this.checkAndEscalate();
    }, {
      scheduled: true,
      timezone: 'Asia/Karachi',
    });

    console.log('✅ SLA Escalation Service initialized');
    return this;
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('SLA Escalation Service stopped');
    }
  }

  /**
   * Calculate SLA deadline based on category and severity
   */
  calculateSLADeadline(category, severity, createdAt = new Date()) {
    const categoryHours = this.slaHoursByCategory[category] || 48;
    const severityHours = this.slaHoursBySeverity[severity] || 48;
    
    // Use the minimum of category and severity SLA
    const slaHours = Math.min(categoryHours, severityHours);
    
    const deadline = new Date(createdAt);
    deadline.setHours(deadline.getHours() + slaHours);
    
    return { deadline, slaHours };
  }

  /**
   * Get current escalation level based on time elapsed
   */
  getEscalationLevel(complaint) {
    const hoursElapsed = this.getHoursElapsed(complaint.createdAt);
    
    if (hoursElapsed >= this.escalationLevels.critical.hours) return 'critical';
    if (hoursElapsed >= this.escalationLevels.city.hours) return 'city';
    if (hoursElapsed >= this.escalationLevels.town.hours) return 'town';
    if (hoursElapsed >= this.escalationLevels.uc.hours) return 'uc';
    
    return null; // No escalation needed
  }

  /**
   * Calculate hours elapsed since complaint creation
   */
  getHoursElapsed(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    return Math.floor((now - created) / (1000 * 60 * 60));
  }

  /**
   * Main escalation check and process
   */
  async checkAndEscalate() {
    try {
      // Find all active complaints that might need escalation
      const activeStatuses = ['submitted', 'acknowledged', 'in_progress'];
      
      const complaints = await Complaint.find({
        'status.current': { $in: activeStatuses },
        createdAt: { 
          $lte: new Date(Date.now() - 48 * 60 * 60 * 1000) // At least 48 hours old
        },
      })
      .populate('ucId', 'name code')
      .populate('townId', 'name code')
      .populate('cityId', 'name code')
      .limit(100)
      .lean();

      console.log(`[Escalation] Checking ${complaints.length} complaints...`);

      let escalatedCount = 0;
      let breachCount = 0;

      for (const complaint of complaints) {
        const result = await this.processComplaint(complaint);
        if (result.escalated) escalatedCount++;
        if (result.breached) breachCount++;
      }

      console.log(`[Escalation] Processed: ${breachCount} breaches, ${escalatedCount} escalations`);
      
      return { breachCount, escalatedCount };
    } catch (error) {
      console.error('[Escalation] Check failed:', error.message);
      throw error;
    }
  }

  /**
   * Process individual complaint for escalation
   */
  async processComplaint(complaint) {
    const result = { breached: false, escalated: false };
    
    const hoursElapsed = this.getHoursElapsed(complaint.createdAt);
    const currentLevel = complaint.escalationLevel || 'uc';
    const newLevel = this.getEscalationLevel(complaint);

    // Check for SLA breach
    if (!complaint.slaBreach && hoursElapsed >= (complaint.slaHours || 48)) {
      await this.markSLABreach(complaint);
      result.breached = true;
    }

    // Check if escalation is needed
    if (newLevel && newLevel !== currentLevel) {
      const levelOrder = ['uc', 'town', 'city', 'critical'];
      const currentIdx = levelOrder.indexOf(currentLevel);
      const newIdx = levelOrder.indexOf(newLevel);

      if (newIdx > currentIdx) {
        await this.escalateComplaint(complaint, newLevel);
        result.escalated = true;
      }
    }

    return result;
  }

  /**
   * Mark complaint as SLA breached
   */
  async markSLABreach(complaint) {
    try {
      await Complaint.findByIdAndUpdate(complaint._id, {
        slaBreach: true,
        'metadata.slaBreachedAt': new Date(),
      });

      // Send notifications
      await this.notifySLABreach(complaint);
      
      // Emit WebSocket event
      websocketService.emitSLABreach(complaint);
      
      console.log(`[Escalation] SLA breach marked for: ${complaint.complaintId}`);
    } catch (error) {
      console.error(`[Escalation] Failed to mark SLA breach:`, error.message);
    }
  }

  /**
   * Escalate complaint to next level
   */
  async escalateComplaint(complaint, newLevel) {
    try {
      const levelConfig = this.escalationLevels[newLevel];
      
      // Add status history entry
      const statusUpdate = {
        status: complaint.status.current,
        timestamp: new Date(),
        updatedByRole: 'system',
        remarks: `Auto-escalated to ${newLevel} level due to SLA breach`,
      };

      const escalationEntry = {
        level: newLevel,
        escalatedAt: new Date(),
        reason: 'auto_sla_breach',
      };

      await Complaint.findByIdAndUpdate(complaint._id, {
        $set: { escalationLevel: newLevel },
        $push: {
          'metadata.escalationHistory': escalationEntry,
          'status.history': statusUpdate,
        },
      });

      // Send notifications to appropriate level
      await this.notifyEscalation(complaint, newLevel);
      
      // Emit WebSocket event
      websocketService.emitEscalation(complaint, {
        from: complaint.escalationLevel || 'uc',
        to: newLevel,
        reason: 'SLA breach - automatic escalation',
      });

      console.log(`[Escalation] Complaint ${complaint.complaintId} escalated to ${newLevel}`);
    } catch (error) {
      console.error(`[Escalation] Failed to escalate complaint:`, error.message);
    }
  }

  /**
   * Notify relevant officials about SLA breach
   */
  async notifySLABreach(complaint) {
    // Push notification
    await pushNotificationService.notifySLABreach(complaint);

    // Email notification to UC Chairman
    if (complaint.ucId) {
      const ucChairman = await User.findOne({
        role: 'uc_chairman',
        ucId: complaint.ucId._id || complaint.ucId,
        isActive: true,
      });

      if (ucChairman?.email) {
        await emailService.sendEmail({
          to: ucChairman.email,
          subject: `⚠️ SLA Breach Alert: Complaint ${complaint.complaintId}`,
          html: this.generateSLABreachEmail(complaint, ucChairman),
        });
      }
    }
  }

  /**
   * Notify officials about escalation
   */
  async notifyEscalation(complaint, level) {
    const levelConfig = this.escalationLevels[level];
    
    // Push notification
    await pushNotificationService.notifyEscalation(complaint, level);

    // Find the appropriate official to notify
    let official = null;
    
    switch (level) {
      case 'town':
        if (complaint.townId) {
          official = await User.findOne({
            role: 'town_chairman',
            townId: complaint.townId._id || complaint.townId,
            isActive: true,
          });
        }
        break;
      
      case 'city':
        if (complaint.cityId) {
          official = await User.findOne({
            role: 'mayor',
            cityId: complaint.cityId._id || complaint.cityId,
            isActive: true,
          });
        }
        break;
      
      case 'critical':
        official = await User.findOne({
          role: 'website_admin',
          isActive: true,
        });
        break;
    }

    if (official?.email) {
      await emailService.sendEmail({
        to: official.email,
        subject: `📈 Escalated Complaint: ${complaint.complaintId}`,
        html: this.generateEscalationEmail(complaint, official, level),
      });
    }
  }

  /**
   * Generate SLA breach notification email
   */
  generateSLABreachEmail(complaint, recipient) {
    const hoursElapsed = this.getHoursElapsed(complaint.createdAt);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .complaint-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
          .warning { color: #DC2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ SLA Breach Alert</h1>
          </div>
          <div class="content">
            <p>Dear ${recipient.name},</p>
            <p class="warning">Complaint ${complaint.complaintId} has breached its SLA deadline.</p>
            
            <div class="complaint-info">
              <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
              <p><strong>Category:</strong> ${complaint.category?.primary || 'N/A'}</p>
              <p><strong>Status:</strong> ${complaint.status?.current || 'N/A'}</p>
              <p><strong>Hours Elapsed:</strong> ${hoursElapsed} hours</p>
              <p><strong>SLA Target:</strong> ${complaint.slaHours || 48} hours</p>
              <p><strong>Location:</strong> ${complaint.location?.address || 'N/A'}</p>
            </div>
            
            <p>Please take immediate action to resolve this complaint.</p>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/dashboard/complaints/${complaint._id}" class="btn">
                View Complaint
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate escalation notification email
   */
  generateEscalationEmail(complaint, recipient, level) {
    const levelNames = {
      town: 'Town Level',
      city: 'City Level',
      critical: 'Critical - Admin Level',
    };

    const hoursElapsed = this.getHoursElapsed(complaint.createdAt);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .complaint-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
          .escalation-badge { display: inline-block; padding: 5px 15px; background: #F59E0B; color: white; border-radius: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📈 Complaint Escalated</h1>
          </div>
          <div class="content">
            <p>Dear ${recipient.name},</p>
            <p>A complaint has been automatically escalated to your attention due to SLA breach.</p>
            
            <p style="text-align: center;">
              <span class="escalation-badge">${levelNames[level] || level}</span>
            </p>
            
            <div class="complaint-info">
              <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
              <p><strong>Category:</strong> ${complaint.category?.primary || 'N/A'}</p>
              <p><strong>Status:</strong> ${complaint.status?.current || 'N/A'}</p>
              <p><strong>Hours Elapsed:</strong> ${hoursElapsed} hours</p>
              <p><strong>Description:</strong> ${(complaint.description || '').substring(0, 200)}...</p>
              <p><strong>Location:</strong> ${complaint.location?.address || 'N/A'}</p>
            </div>
            
            <p>As this complaint has exceeded normal resolution timelines, your intervention is required.</p>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/dashboard/complaints/${complaint._id}" class="btn">
                Take Action
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Manually trigger escalation check (for testing)
   */
  async triggerCheck() {
    return await this.checkAndEscalate();
  }

  /**
   * Get escalation report
   */
  async getEscalationReport(filters = {}) {
    const matchStage = {
      slaBreach: true,
    };

    if (filters.ucId) matchStage.ucId = filters.ucId;
    if (filters.townId) matchStage.townId = filters.townId;
    if (filters.cityId) matchStage.cityId = filters.cityId;
    if (filters.dateFrom) {
      matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
    }

    const report = await Complaint.aggregate([
      { $match: matchStage },
      {
        $facet: {
          byLevel: [
            { $group: { _id: '$escalationLevel', count: { $sum: 1 } } },
          ],
          byCategory: [
            { $group: { _id: '$category.primary', count: { $sum: 1 } } },
          ],
          byStatus: [
            { $group: { _id: '$status.current', count: { $sum: 1 } } },
          ],
          avgResolutionTime: [
            { $match: { 'resolution.resolvedAt': { $exists: true } } },
            {
              $project: {
                resolutionTime: {
                  $divide: [
                    { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                    1000 * 60 * 60, // Convert to hours
                  ],
                },
              },
            },
            { $group: { _id: null, avgHours: { $avg: '$resolutionTime' } } },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    return report[0];
  }
}

// Export singleton instance
module.exports = new EscalationService();
