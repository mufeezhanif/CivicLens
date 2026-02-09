const mongoose = require('mongoose');

/**
 * Participant sub-schema
 * Tracks participants in a conversation
 */
const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['citizen', 'uc_chairman', 'town_chairman', 'mayor', 'website_admin'],
    required: true,
  },
  // Anonymous display name for citizens in complaint chats
  displayName: {
    type: String,
    default: 'Anonymous Citizen',
  },
  // Whether this participant started the conversation
  isInitiator: {
    type: Boolean,
    default: false,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  lastReadAt: {
    type: Date,
    default: Date.now,
  },
  // Track if participant has muted notifications
  isMuted: {
    type: Boolean,
    default: false,
  },
  // Track if participant has left the conversation
  hasLeft: {
    type: Boolean,
    default: false,
  },
  leftAt: Date,
}, { _id: false });

/**
 * Conversation Schema
 * Supports different types of conversations:
 * - complaint: UC Chairman <-> Anonymous Citizen (about a specific complaint)
 * - hierarchy: UC <-> Town <-> Mayor (official communications)
 * - support: Website Admin <-> Any User
 */
const conversationSchema = new mongoose.Schema({
  // Conversation type determines behavior and visibility rules
  type: {
    type: String,
    enum: ['complaint', 'hierarchy', 'support'],
    required: true,
    index: true,
  },
  
  // Reference to complaint (required for 'complaint' type)
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    index: true,
  },
  
  // Complaint ID string for easy lookup
  complaintNumber: {
    type: String,
    trim: true,
  },
  
  // Participants in the conversation
  participants: {
    type: [participantSchema],
    validate: {
      validator: function(participants) {
        return participants.length >= 2 && participants.length <= 5;
      },
      message: 'Conversation must have between 2 and 5 participants',
    },
  },
  
  // Title for the conversation (auto-generated or custom)
  title: {
    type: String,
    maxlength: 200,
    trim: true,
  },
  
  // Subject/topic for hierarchy chats
  subject: {
    type: String,
    maxlength: 500,
    trim: true,
  },
  
  // Hierarchy references for filtering
  ucId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UC',
    index: true,
  },
  townId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Town',
    index: true,
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true,
  },
  
  // Last message preview
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    senderRole: String,
    sentAt: Date,
    isSystem: Boolean,
  },
  
  // Message count
  messageCount: {
    type: Number,
    default: 0,
  },
  
  // Unread counts per participant (userId -> count)
  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  
  // Conversation status
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active',
    index: true,
  },
  
  // Who closed/archived the conversation
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  closedAt: Date,
  closeReason: String,
  
  // Pinned for quick access
  isPinned: {
    type: Boolean,
    default: false,
  },
  
  // Priority for hierarchy conversations
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  
  // Metadata for additional info
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for efficient queries
conversationSchema.index({ 'participants.userId': 1, status: 1 });
conversationSchema.index({ type: 1, status: 1, updatedAt: -1 });
conversationSchema.index({ complaintId: 1, type: 1 });
conversationSchema.index({ ucId: 1, type: 1, status: 1 });
conversationSchema.index({ townId: 1, type: 1, status: 1 });
conversationSchema.index({ cityId: 1, type: 1, status: 1 });

/**
 * Virtual for participant user IDs
 */
conversationSchema.virtual('participantIds').get(function() {
  return this.participants.map(p => p.userId);
});

/**
 * Pre-save: Generate title if not provided
 */
conversationSchema.pre('save', function() {
  if (this.isNew && !this.title) {
    switch (this.type) {
      case 'complaint':
        this.title = `Complaint ${this.complaintNumber || 'Discussion'}`;
        break;
      case 'hierarchy':
        this.title = this.subject || 'Official Communication';
        break;
      case 'support':
        this.title = 'Support Chat';
        break;
    }
  }
});

/**
 * Instance method to add a participant
 */
conversationSchema.methods.addParticipant = async function(userId, role, displayName = null) {
  // Check if already a participant
  const existingIndex = this.participants.findIndex(
    p => p.userId.equals(userId)
  );
  
  if (existingIndex !== -1) {
    // Re-add if they had left
    if (this.participants[existingIndex].hasLeft) {
      this.participants[existingIndex].hasLeft = false;
      this.participants[existingIndex].joinedAt = new Date();
    }
    return this;
  }
  
  // Generate display name for citizens in complaint chats
  let name = displayName;
  if (!name && this.type === 'complaint' && role === 'citizen') {
    name = 'Anonymous Citizen';
  } else if (!name) {
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    name = user?.name || 'Unknown User';
  }
  
  this.participants.push({
    userId,
    role,
    displayName: name,
    isInitiator: this.participants.length === 0,
    joinedAt: new Date(),
    lastReadAt: new Date(),
  });
  
  // Initialize unread count
  this.unreadCounts.set(userId.toString(), 0);
  
  return this.save();
};

/**
 * Instance method to remove a participant (soft leave)
 */
conversationSchema.methods.removeParticipant = async function(userId) {
  const participant = this.participants.find(p => p.userId.equals(userId));
  if (participant) {
    participant.hasLeft = true;
    participant.leftAt = new Date();
  }
  return this.save();
};

/**
 * Instance method to check if user is participant
 */
conversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(
    p => p.userId.equals(userId) && !p.hasLeft
  );
};

/**
 * Instance method to get participant info
 */
conversationSchema.methods.getParticipantInfo = function(userId) {
  return this.participants.find(p => p.userId.equals(userId));
};

/**
 * Instance method to update last read
 */
conversationSchema.methods.markAsRead = async function(userId) {
  const participant = this.participants.find(p => p.userId.equals(userId));
  if (participant) {
    participant.lastReadAt = new Date();
    this.unreadCounts.set(userId.toString(), 0);
    return this.save();
  }
  return this;
};

/**
 * Instance method to increment unread for all except sender
 */
conversationSchema.methods.incrementUnreadExcept = async function(senderId) {
  this.participants.forEach(p => {
    if (!p.userId.equals(senderId) && !p.hasLeft) {
      const current = this.unreadCounts.get(p.userId.toString()) || 0;
      this.unreadCounts.set(p.userId.toString(), current + 1);
    }
  });
  return this.save();
};

/**
 * Instance method to update last message
 */
conversationSchema.methods.updateLastMessage = async function(message) {
  this.lastMessage = {
    content: message.content.substring(0, 100),
    senderId: message.senderId,
    senderRole: message.senderRole,
    sentAt: message.createdAt || new Date(),
    isSystem: message.type === 'system',
  };
  this.messageCount += 1;
  return this.save();
};

/**
 * Instance method to close conversation
 */
conversationSchema.methods.close = async function(closedBy, reason = '') {
  this.status = 'closed';
  this.closedBy = closedBy;
  this.closedAt = new Date();
  this.closeReason = reason;
  return this.save();
};

/**
 * Instance method to archive conversation
 */
conversationSchema.methods.archive = async function() {
  this.status = 'archived';
  return this.save();
};

/**
 * Instance method to reopen conversation
 */
conversationSchema.methods.reopen = async function() {
  this.status = 'active';
  this.closedBy = null;
  this.closedAt = null;
  this.closeReason = null;
  return this.save();
};

/**
 * Static method to find conversations for a user
 */
conversationSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    'participants.userId': userId,
    'participants.hasLeft': { $ne: true },
  };
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.status) {
    query.status = options.status;
  } else {
    query.status = { $ne: 'closed' };
  }
  
  return this.find(query)
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Static method to find complaint conversation
 */
conversationSchema.statics.findByComplaint = function(complaintId) {
  return this.findOne({
    complaintId,
    type: 'complaint',
    status: { $ne: 'closed' },
  });
};

/**
 * Static method to find or create complaint conversation
 */
conversationSchema.statics.findOrCreateComplaintChat = async function(complaint, initiatorUserId, initiatorRole) {
  // Only UC Chairman can initiate complaint chats
  if (initiatorRole !== 'uc_chairman') {
    throw new Error('Only UC Chairman can initiate complaint discussions');
  }
  
  // Check if conversation already exists
  let conversation = await this.findOne({
    complaintId: complaint._id,
    type: 'complaint',
    status: { $ne: 'closed' },
  });
  
  if (conversation) {
    return conversation;
  }
  
  // Get citizen user ID from complaint
  const citizenUserId = complaint.citizenUser;
  if (!citizenUserId) {
    throw new Error('Complaint does not have a registered citizen user');
  }
  
  // Create new conversation
  conversation = new this({
    type: 'complaint',
    complaintId: complaint._id,
    complaintNumber: complaint.complaintId,
    title: `Complaint #${complaint.complaintId}`,
    ucId: complaint.ucId,
    townId: complaint.townId,
    cityId: complaint.cityId,
    participants: [
      {
        userId: initiatorUserId,
        role: initiatorRole,
        displayName: 'UC Chairman',
        isInitiator: true,
        joinedAt: new Date(),
        lastReadAt: new Date(),
      },
      {
        userId: citizenUserId,
        role: 'citizen',
        displayName: 'Anonymous Citizen',
        isInitiator: false,
        joinedAt: new Date(),
        lastReadAt: new Date(),
      },
    ],
    unreadCounts: new Map([
      [initiatorUserId.toString(), 0],
      [citizenUserId.toString(), 0],
    ]),
  });
  
  return conversation.save();
};

/**
 * Static method to create hierarchy conversation
 */
conversationSchema.statics.createHierarchyChat = async function(
  initiatorUserId, 
  initiatorRole, 
  targetUserId, 
  targetRole, 
  subject,
  hierarchyRefs = {}
) {
  // Validate hierarchy communication rules
  const validCommunications = {
    uc_chairman: ['town_chairman', 'mayor'],
    town_chairman: ['uc_chairman', 'mayor'],
    mayor: ['town_chairman', 'uc_chairman'],
    website_admin: ['uc_chairman', 'town_chairman', 'mayor', 'citizen'],
  };
  
  if (!validCommunications[initiatorRole]?.includes(targetRole)) {
    throw new Error(`${initiatorRole} cannot initiate chat with ${targetRole}`);
  }
  
  // Get user info for display names
  const User = mongoose.model('User');
  const [initiator, target] = await Promise.all([
    User.findById(initiatorUserId),
    User.findById(targetUserId),
  ]);
  
  if (!initiator || !target) {
    throw new Error('One or more users not found');
  }
  
  // Check for existing active conversation between these users
  let conversation = await this.findOne({
    type: 'hierarchy',
    'participants.userId': { $all: [initiatorUserId, targetUserId] },
    status: 'active',
  });
  
  if (conversation) {
    return conversation;
  }
  
  const roleDisplayNames = {
    uc_chairman: 'UC Chairman',
    town_chairman: 'Town Chairman',
    mayor: 'Mayor',
    website_admin: 'Admin',
    citizen: 'Citizen',
  };
  
  conversation = new this({
    type: 'hierarchy',
    subject,
    title: subject || `${roleDisplayNames[initiatorRole]} - ${roleDisplayNames[targetRole]} Chat`,
    ucId: hierarchyRefs.ucId,
    townId: hierarchyRefs.townId,
    cityId: hierarchyRefs.cityId,
    participants: [
      {
        userId: initiatorUserId,
        role: initiatorRole,
        displayName: `${initiator.name} (${roleDisplayNames[initiatorRole]})`,
        isInitiator: true,
        joinedAt: new Date(),
        lastReadAt: new Date(),
      },
      {
        userId: targetUserId,
        role: targetRole,
        displayName: `${target.name} (${roleDisplayNames[targetRole]})`,
        isInitiator: false,
        joinedAt: new Date(),
        lastReadAt: new Date(),
      },
    ],
    unreadCounts: new Map([
      [initiatorUserId.toString(), 0],
      [targetUserId.toString(), 0],
    ]),
  });
  
  return conversation.save();
};

/**
 * Static method to get unread count for user
 */
conversationSchema.statics.getTotalUnreadCount = async function(userId) {
  const conversations = await this.find({
    'participants.userId': userId,
    'participants.hasLeft': { $ne: true },
    status: 'active',
  });
  
  let total = 0;
  conversations.forEach(conv => {
    total += conv.unreadCounts.get(userId.toString()) || 0;
  });
  
  return total;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
