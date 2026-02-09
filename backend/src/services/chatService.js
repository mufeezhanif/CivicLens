/**
 * Chat Service
 * Handles all chat-related business logic including:
 * - Complaint discussions (UC Chairman <-> Anonymous Citizen)
 * - Hierarchy communications (UC <-> Town <-> Mayor)
 * - Message sending and retrieval
 * - Real-time WebSocket integration
 */

const { Conversation, Message, Complaint, User } = require('../models');
const websocketService = require('./websocketService');

class ChatService {
  constructor() {
    this.roleDisplayNames = {
      citizen: 'Citizen',
      uc_chairman: 'UC Chairman',
      town_chairman: 'Town Chairman',
      mayor: 'Mayor',
      website_admin: 'Admin',
    };
  }

  // ==================== CONVERSATION MANAGEMENT ====================

  /**
   * Start a complaint discussion (UC Chairman only)
   * @param {string} complaintId - The complaint ID
   * @param {string} ucChairmanId - The UC Chairman user ID
   * @returns {Promise<Conversation>}
   */
  async startComplaintChat(complaintId, ucChairmanId) {
    // Verify the UC Chairman
    const ucChairman = await User.findById(ucChairmanId);
    if (!ucChairman || ucChairman.role !== 'uc_chairman') {
      throw new Error('Only UC Chairmen can start complaint discussions');
    }

    // Get the complaint
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    // Verify UC Chairman manages this complaint's UC
    if (!complaint.ucId?.equals(ucChairman.ucId)) {
      throw new Error('You can only discuss complaints in your UC');
    }

    // Check if citizen user exists
    if (!complaint.citizenUser) {
      throw new Error('This complaint was submitted anonymously and cannot be discussed via chat');
    }

    // Find or create conversation
    const conversation = await Conversation.findOrCreateComplaintChat(
      complaint,
      ucChairmanId,
      'uc_chairman'
    );

    // Create system message if new conversation
    if (conversation.messageCount === 0) {
      await Message.createSystemMessage(conversation._id, 'conversation_created', {
        userId: ucChairmanId,
        complaintId: complaint.complaintId,
      });
    }

    // Emit WebSocket event
    this.emitConversationCreated(conversation);

    return conversation;
  }

  /**
   * Start hierarchy chat (UC <-> Town <-> Mayor)
   * @param {string} initiatorId - The initiator's user ID
   * @param {string} targetId - The target's user ID
   * @param {string} subject - The conversation subject
   * @returns {Promise<Conversation>}
   */
  async startHierarchyChat(initiatorId, targetId, subject) {
    const initiator = await User.findById(initiatorId);
    const target = await User.findById(targetId);

    if (!initiator || !target) {
      throw new Error('One or more users not found');
    }

    // Citizens cannot start hierarchy chats
    if (initiator.role === 'citizen') {
      throw new Error('Citizens cannot initiate hierarchy communications');
    }

    // Determine hierarchy references
    const hierarchyRefs = {};
    if (initiator.ucId) hierarchyRefs.ucId = initiator.ucId;
    if (target.ucId) hierarchyRefs.ucId = target.ucId;
    if (initiator.townId) hierarchyRefs.townId = initiator.townId;
    if (target.townId) hierarchyRefs.townId = target.townId;
    if (initiator.cityId) hierarchyRefs.cityId = initiator.cityId;
    if (target.cityId) hierarchyRefs.cityId = target.cityId;

    const conversation = await Conversation.createHierarchyChat(
      initiatorId,
      initiator.role,
      targetId,
      target.role,
      subject,
      hierarchyRefs
    );

    // Create system message if new
    if (conversation.messageCount === 0) {
      await Message.createSystemMessage(conversation._id, 'conversation_created', {
        userId: initiatorId,
        name: initiator.name,
      });
    }

    // Emit WebSocket event
    this.emitConversationCreated(conversation);

    return conversation;
  }

  /**
   * Get user's conversations
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getUserConversations(userId, options = {}) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const conversations = await Conversation.findByUser(userId, {
      type: options.type,
      status: options.status || 'active',
      limit: options.limit || 50,
    });

    // Add formatted data for each conversation
    return conversations.map(conv => this.formatConversation(conv, userId));
  }

  /**
   * Get conversation by ID with access check
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - Requesting user ID
   * @returns {Promise<Conversation>}
   */
  async getConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('complaintId', 'complaintId category status')
      .populate('participants.userId', 'name role avatar');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check access
    if (!conversation.isParticipant(userId)) {
      throw new Error('You are not a participant in this conversation');
    }

    return this.formatConversation(conversation, userId);
  }

  /**
   * Close a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User closing the conversation
   * @param {string} reason - Reason for closing
   * @returns {Promise<Conversation>}
   */
  async closeConversation(conversationId, userId, reason = '') {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Only participants or admins can close
    const user = await User.findById(userId);
    if (!conversation.isParticipant(userId) && user.role !== 'website_admin') {
      throw new Error('You cannot close this conversation');
    }

    await conversation.close(userId, reason);

    // Create system message
    await Message.createSystemMessage(conversation._id, 'closed', {
      userId,
      name: user.name,
      reason,
    });

    // Emit WebSocket event
    this.emitConversationClosed(conversation);

    return conversation;
  }

  // ==================== MESSAGE MANAGEMENT ====================

  /**
   * Send a message
   * @param {string} conversationId - Conversation ID
   * @param {string} senderId - Sender user ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Message>}
   */
  async sendMessage(conversationId, senderId, messageData) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.status !== 'active') {
      throw new Error('Cannot send messages to a closed conversation');
    }

    // Verify sender is participant
    if (!conversation.isParticipant(senderId)) {
      throw new Error('You are not a participant in this conversation');
    }

    // Get sender info
    const sender = await User.findById(senderId);
    const participantInfo = conversation.getParticipantInfo(senderId);

    // Determine display name (anonymous for citizens in complaint chats)
    let displayName = participantInfo?.displayName || sender.name;
    if (conversation.type === 'complaint' && sender.role === 'citizen') {
      displayName = 'Anonymous Citizen';
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      senderRole: sender.role,
      senderDisplayName: displayName,
      type: messageData.type || 'text',
      content: messageData.content,
      attachments: messageData.attachments || [],
      replyTo: messageData.replyTo,
      priority: messageData.priority || 'normal',
      metadata: {
        clientMessageId: messageData.clientMessageId,
        platform: messageData.platform || 'web',
      },
    });

    await message.save();

    // Update conversation's last message
    await conversation.updateLastMessage(message);

    // Increment unread counts for other participants
    await conversation.incrementUnreadExcept(senderId);

    // Format message for response
    const formattedMessage = this.formatMessage(message, senderId);

    // Emit WebSocket event to all participants
    this.emitNewMessage(conversation, formattedMessage);

    return formattedMessage;
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - Requesting user ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>}
   */
  async getMessages(conversationId, userId, options = {}) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify access
    if (!conversation.isParticipant(userId)) {
      throw new Error('You are not a participant in this conversation');
    }

    const messages = await Message.findByConversation(conversationId, {
      before: options.before,
      after: options.after,
      limit: options.limit || 50,
    });

    // Mark conversation as read
    await conversation.markAsRead(userId);

    // Emit read receipt
    this.emitConversationRead(conversation, userId);

    return messages.map(msg => this.formatMessage(msg, userId));
  }

  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} lastMessageId - Last read message ID (optional)
   * @returns {Promise<void>}
   */
  async markAsRead(conversationId, userId, lastMessageId = null) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.isParticipant(userId)) {
      return;
    }

    await conversation.markAsRead(userId);

    // If specific message ID provided, mark all messages up to that point
    if (lastMessageId) {
      await Message.updateMany(
        {
          conversationId,
          _id: { $lte: lastMessageId },
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId },
        },
        {
          $push: { readBy: { userId, readAt: new Date() } },
        }
      );
    }

    // Emit read receipt
    this.emitConversationRead(conversation, userId);
  }

  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} userId - Editor user ID
   * @param {string} newContent - New content
   * @returns {Promise<Message>}
   */
  async editMessage(messageId, userId, newContent) {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    await message.edit(newContent, userId);

    const conversation = await Conversation.findById(message.conversationId);
    
    // Emit WebSocket event
    this.emitMessageEdited(conversation, message);

    return this.formatMessage(message, userId);
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User deleting
   * @returns {Promise<void>}
   */
  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can delete
    if (!message.senderId.equals(userId)) {
      throw new Error('Only the sender can delete this message');
    }

    await message.softDelete(userId);

    const conversation = await Conversation.findById(message.conversationId);
    
    // Emit WebSocket event
    this.emitMessageDeleted(conversation, messageId);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Format conversation for API response
   */
  formatConversation(conversation, userId) {
    const participantInfo = conversation.getParticipantInfo(userId);
    const unreadCount = conversation.unreadCounts?.get(userId.toString()) || 0;
    
    // Find the other participant for display
    const otherParticipant = conversation.participants.find(
      p => !p.userId.equals(userId) && !p.hasLeft
    );

    return {
      id: conversation._id,
      type: conversation.type,
      title: conversation.title,
      subject: conversation.subject,
      status: conversation.status,
      complaintId: conversation.complaintId,
      complaintNumber: conversation.complaintNumber,
      participants: conversation.participants
        .filter(p => !p.hasLeft)
        .map(p => ({
          userId: p.userId,
          displayName: p.displayName,
          role: p.role,
          isInitiator: p.isInitiator,
        })),
      otherParticipant: otherParticipant ? {
        displayName: otherParticipant.displayName,
        role: otherParticipant.role,
      } : null,
      lastMessage: conversation.lastMessage,
      unreadCount,
      messageCount: conversation.messageCount,
      isPinned: conversation.isPinned,
      priority: conversation.priority,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Format message for API response
   */
  formatMessage(message, userId) {
    return {
      id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      senderDisplayName: message.senderDisplayName,
      type: message.type,
      content: message.content,
      attachments: message.attachments,
      replyTo: message.replyTo ? {
        id: message.replyTo._id,
        content: message.replyTo.content,
        senderDisplayName: message.replyTo.senderDisplayName,
      } : null,
      isOwn: message.senderId.equals(userId),
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      isDeleted: message.isDeleted,
      priority: message.priority,
      status: message.status,
      readBy: message.readBy?.map(r => ({
        userId: r.userId,
        readAt: r.readAt,
      })),
      action: message.action,
      createdAt: message.createdAt,
    };
  }

  // ==================== WEBSOCKET EMISSIONS ====================

  /**
   * Emit new conversation created
   */
  emitConversationCreated(conversation) {
    const io = websocketService.getIO();
    if (!io) return;

    conversation.participants.forEach(participant => {
      if (!participant.hasLeft) {
        io.to(`user:${participant.userId}`).emit('chat:conversationCreated', {
          conversation: this.formatConversation(conversation, participant.userId),
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  /**
   * Emit new message to all participants
   */
  emitNewMessage(conversation, message) {
    const io = websocketService.getIO();
    if (!io) return;

    conversation.participants.forEach(participant => {
      if (!participant.hasLeft) {
        io.to(`user:${participant.userId}`).emit('chat:newMessage', {
          conversationId: conversation._id,
          message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Also emit to conversation room
    io.to(`chat:${conversation._id}`).emit('chat:newMessage', {
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit message edited
   */
  emitMessageEdited(conversation, message) {
    const io = websocketService.getIO();
    if (!io) return;

    io.to(`chat:${conversation._id}`).emit('chat:messageEdited', {
      conversationId: conversation._id,
      messageId: message._id,
      content: message.content,
      editedAt: message.editedAt,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit message deleted
   */
  emitMessageDeleted(conversation, messageId) {
    const io = websocketService.getIO();
    if (!io) return;

    io.to(`chat:${conversation._id}`).emit('chat:messageDeleted', {
      conversationId: conversation._id,
      messageId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit conversation read receipt
   */
  emitConversationRead(conversation, userId) {
    const io = websocketService.getIO();
    if (!io) return;

    io.to(`chat:${conversation._id}`).emit('chat:read', {
      conversationId: conversation._id,
      userId,
      readAt: new Date().toISOString(),
    });
  }

  /**
   * Emit conversation closed
   */
  emitConversationClosed(conversation) {
    const io = websocketService.getIO();
    if (!io) return;

    io.to(`chat:${conversation._id}`).emit('chat:conversationClosed', {
      conversationId: conversation._id,
      closedAt: conversation.closedAt,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit typing indicator
   */
  emitTyping(conversationId, userId, isTyping) {
    const io = websocketService.getIO();
    if (!io) return;

    io.to(`chat:${conversationId}`).emit('chat:typing', {
      conversationId,
      userId,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== STATS & UTILITIES ====================

  /**
   * Get total unread count for user
   */
  async getUnreadCount(userId) {
    return Conversation.getTotalUnreadCount(userId);
  }

  /**
   * Get conversation for a complaint
   */
  async getComplaintConversation(complaintId) {
    return Conversation.findByComplaint(complaintId);
  }

  /**
   * Check if user can chat about complaint
   */
  async canChatAboutComplaint(complaintId, userId) {
    const user = await User.findById(userId);
    const complaint = await Complaint.findById(complaintId);

    if (!user || !complaint) {
      return { allowed: false, reason: 'User or complaint not found' };
    }

    // UC Chairman whose UC matches complaint UC
    if (user.role === 'uc_chairman' && complaint.ucId?.equals(user.ucId)) {
      return { allowed: true, canInitiate: true };
    }

    // Citizen who submitted the complaint
    if (user.role === 'citizen' && complaint.citizenUser?.equals(userId)) {
      return { allowed: true, canInitiate: false };
    }

    return { allowed: false, reason: 'Not authorized to chat about this complaint' };
  }

  /**
   * Get available hierarchy chat targets for a user
   */
  async getAvailableChatTargets(userId) {
    const user = await User.findById(userId)
      .populate('ucId', 'town city')
      .populate('townId', 'city');

    if (!user) {
      throw new Error('User not found');
    }

    const targets = [];

    switch (user.role) {
      case 'uc_chairman': {
        // Can chat with Town Chairman and Mayor
        const townChairmen = await User.find({
          role: 'town_chairman',
          townId: user.ucId?.town,
          isActive: true,
        }).select('name role townId');

        const mayors = await User.find({
          role: 'mayor',
          cityId: user.ucId?.city,
          isActive: true,
        }).select('name role cityId');

        targets.push(...townChairmen, ...mayors);
        break;
      }

      case 'town_chairman': {
        // Can chat with UC Chairmen in their town and Mayor
        const ucChairmen = await User.find({
          role: 'uc_chairman',
          isActive: true,
        }).populate({
          path: 'ucId',
          match: { town: user.townId },
        }).select('name role ucId');

        const filteredUCChairmen = ucChairmen.filter(uc => uc.ucId);

        const mayors = await User.find({
          role: 'mayor',
          cityId: user.townId?.city,
          isActive: true,
        }).select('name role cityId');

        targets.push(...filteredUCChairmen, ...mayors);
        break;
      }

      case 'mayor': {
        // Can chat with all Town Chairmen and UC Chairmen in their city
        const townChairmen = await User.find({
          role: 'town_chairman',
          isActive: true,
        }).populate({
          path: 'townId',
          match: { city: user.cityId },
        }).select('name role townId');

        const filteredTownChairmen = townChairmen.filter(tc => tc.townId);
        targets.push(...filteredTownChairmen);
        break;
      }
    }

    return targets.map(t => ({
      id: t._id,
      name: t.name,
      role: t.role,
      roleDisplay: this.roleDisplayNames[t.role],
    }));
  }
}

module.exports = new ChatService();
