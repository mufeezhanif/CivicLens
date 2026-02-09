const mongoose = require('mongoose');

/**
 * Attachment sub-schema for file/image attachments
 */
const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'file', 'voice'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  publicId: String,
  filename: String,
  mimeType: String,
  size: Number, // in bytes
  thumbnailUrl: String,
  // For voice messages
  duration: Number, // in seconds
}, { _id: false });

/**
 * Read receipt sub-schema
 */
const readReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  readAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

/**
 * Message Schema
 * Individual messages within a conversation
 */
const messageSchema = new mongoose.Schema({
  // Reference to parent conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  
  // Sender information
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  senderRole: {
    type: String,
    enum: ['citizen', 'uc_chairman', 'town_chairman', 'mayor', 'website_admin', 'system'],
    required: true,
  },
  
  // Display name at time of sending (for anonymity preservation)
  senderDisplayName: {
    type: String,
    default: 'Anonymous',
  },
  
  // Message type
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'system', 'action'],
    default: 'text',
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
    trim: true,
  },
  
  // Attachments (images, files)
  attachments: {
    type: [attachmentSchema],
    validate: {
      validator: function(attachments) {
        return attachments.length <= 5;
      },
      message: 'Maximum 5 attachments per message',
    },
  },
  
  // For referencing previous messages (quotes/replies)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  
  // Read receipts
  readBy: [readReceiptSchema],
  
  // Delivery status
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent',
  },
  
  // Message delivery timestamp
  deliveredAt: Date,
  
  // Edit tracking
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
  originalContent: String,
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // System message action (for type: 'action' or 'system')
  action: {
    type: {
      type: String,
      enum: [
        'conversation_created',
        'participant_joined',
        'participant_left',
        'status_changed',
        'escalated',
        'resolved',
        'reopened',
        'closed',
      ],
    },
    targetId: mongoose.Schema.Types.ObjectId,
    targetName: String,
    data: mongoose.Schema.Types.Mixed,
  },
  
  // Priority for urgent messages
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal',
  },
  
  // Metadata for additional context
  metadata: {
    clientMessageId: String, // For deduplication
    ipAddress: String,
    userAgent: String,
    platform: {
      type: String,
      enum: ['web', 'mobile', 'whatsapp'],
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ 'metadata.clientMessageId': 1 });

/**
 * Virtual for checking if message is recent (last 5 minutes)
 */
messageSchema.virtual('isRecent').get(function() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return this.createdAt.getTime() > fiveMinutesAgo;
});

/**
 * Virtual for read count
 */
messageSchema.virtual('readCount').get(function() {
  return this.readBy?.length || 0;
});

/**
 * Pre-save: Sanitize content
 */
messageSchema.pre('save', function() {
  if (this.isModified('content')) {
    // Basic XSS prevention (additional sanitization should be done at API level)
    this.content = this.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
});

/**
 * Post-save: Update conversation's lastMessage
 */
messageSchema.post('save', async function(doc) {
  if (doc.type !== 'system' || doc.action?.type) {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(doc.conversationId, {
      lastMessage: {
        content: doc.content.substring(0, 100),
        senderId: doc.senderId,
        senderRole: doc.senderRole,
        sentAt: doc.createdAt,
        isSystem: doc.type === 'system',
      },
      $inc: { messageCount: 1 },
    });
  }
});

/**
 * Instance method to mark as read by user
 */
messageSchema.methods.markAsReadBy = async function(userId) {
  // Check if already read by this user
  const alreadyRead = this.readBy.some(r => r.userId.equals(userId));
  if (alreadyRead) {
    return this;
  }
  
  this.readBy.push({
    userId,
    readAt: new Date(),
  });
  
  // Update status if all participants have read
  const Conversation = mongoose.model('Conversation');
  const conversation = await Conversation.findById(this.conversationId);
  const activeParticipants = conversation.participants.filter(p => !p.hasLeft);
  
  if (this.readBy.length >= activeParticipants.length - 1) { // -1 for sender
    this.status = 'read';
  } else if (this.status === 'sent') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
  }
  
  return this.save();
};

/**
 * Instance method to edit message
 */
messageSchema.methods.edit = async function(newContent, editorId) {
  // Only sender can edit
  if (!this.senderId.equals(editorId)) {
    throw new Error('Only the sender can edit this message');
  }
  
  // Can only edit within 15 minutes
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  if (this.createdAt.getTime() < fifteenMinutesAgo) {
    throw new Error('Messages can only be edited within 15 minutes of sending');
  }
  
  if (!this.originalContent) {
    this.originalContent = this.content;
  }
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  
  return this.save();
};

/**
 * Instance method to soft delete message
 */
messageSchema.methods.softDelete = async function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.content = 'This message has been deleted';
  this.attachments = [];
  
  return this.save();
};

/**
 * Static method to find messages by conversation
 */
messageSchema.statics.findByConversation = function(conversationId, options = {}) {
  const query = {
    conversationId,
    isDeleted: { $ne: true },
  };
  
  // Pagination using cursor (message ID)
  if (options.before) {
    query._id = { $lt: options.before };
  }
  if (options.after) {
    query._id = { $gt: options.after };
  }
  
  return this.find(query)
    .sort({ createdAt: options.after ? 1 : -1 })
    .limit(options.limit || 50)
    .populate('replyTo', 'content senderDisplayName createdAt');
};

/**
 * Static method to create a system message
 */
messageSchema.statics.createSystemMessage = async function(conversationId, actionType, data = {}) {
  const actionMessages = {
    conversation_created: 'Conversation started',
    participant_joined: `${data.name || 'A participant'} joined the conversation`,
    participant_left: `${data.name || 'A participant'} left the conversation`,
    status_changed: `Status changed to ${data.status || 'updated'}`,
    escalated: 'Complaint has been escalated',
    resolved: 'Complaint has been marked as resolved',
    reopened: 'Conversation has been reopened',
    closed: 'Conversation has been closed',
  };
  
  const message = new this({
    conversationId,
    senderId: data.userId || new mongoose.Types.ObjectId(),
    senderRole: 'system',
    senderDisplayName: 'System',
    type: 'system',
    content: actionMessages[actionType] || 'System notification',
    action: {
      type: actionType,
      targetId: data.targetId,
      targetName: data.name,
      data,
    },
  });
  
  return message.save();
};

/**
 * Static method to get unread messages for user in conversation
 */
messageSchema.statics.getUnreadCount = async function(conversationId, userId, lastReadAt) {
  return this.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    createdAt: { $gt: lastReadAt },
    isDeleted: { $ne: true },
  });
};

/**
 * Static method to search messages
 */
messageSchema.statics.search = function(query, userId, options = {}) {
  const searchQuery = {
    $text: { $search: query },
    isDeleted: { $ne: true },
  };
  
  if (options.conversationId) {
    searchQuery.conversationId = options.conversationId;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Text index for search
messageSchema.index({ content: 'text' });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
