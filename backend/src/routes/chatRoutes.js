/**
 * Chat Routes
 * API endpoints for chat functionality
 * 
 * Endpoints:
 * - GET /api/chat/conversations - Get user's conversations
 * - GET /api/chat/conversations/:id - Get specific conversation
 * - POST /api/chat/conversations/complaint - Start complaint discussion (UC only)
 * - POST /api/chat/conversations/hierarchy - Start hierarchy chat
 * - POST /api/chat/conversations/:id/close - Close conversation
 * - GET /api/chat/conversations/:id/messages - Get messages
 * - POST /api/chat/conversations/:id/messages - Send message
 * - PUT /api/chat/messages/:id - Edit message
 * - DELETE /api/chat/messages/:id - Delete message
 * - PUT /api/chat/conversations/:id/read - Mark as read
 * - GET /api/chat/unread-count - Get total unread count
 * - GET /api/chat/targets - Get available chat targets
 */

const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const { protect, authorize } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// All chat routes require authentication
router.use(protect);

/**
 * @route   GET /api/chat/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get('/conversations', asyncHandler(async (req, res) => {
  const { type, status, limit } = req.query;
  
  const conversations = await chatService.getUserConversations(req.user._id, {
    type,
    status,
    limit: parseInt(limit) || 50,
  });

  res.json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
}));

/**
 * @route   GET /api/chat/conversations/:id
 * @desc    Get specific conversation with details
 * @access  Private (Participants only)
 */
router.get('/conversations/:id', asyncHandler(async (req, res) => {
  const conversation = await chatService.getConversation(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    data: conversation,
  });
}));

/**
 * @route   POST /api/chat/conversations/complaint
 * @desc    Start a complaint discussion (UC Chairman only)
 * @access  Private (UC Chairman only)
 * @body    { complaintId: string }
 */
router.post('/conversations/complaint', 
  authorize('uc_chairman'),
  asyncHandler(async (req, res) => {
    const { complaintId } = req.body;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        error: 'Complaint ID is required',
      });
    }

    const conversation = await chatService.startComplaintChat(
      complaintId,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Complaint discussion started',
      data: chatService.formatConversation(conversation, req.user._id),
    });
  })
);

/**
 * @route   POST /api/chat/conversations/hierarchy
 * @desc    Start a hierarchy chat (Officials only)
 * @access  Private (UC/Town/Mayor/Admin only)
 * @body    { targetUserId: string, subject: string }
 */
router.post('/conversations/hierarchy',
  authorize('uc_chairman', 'town_chairman', 'mayor', 'website_admin'),
  asyncHandler(async (req, res) => {
    const { targetUserId, subject } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required',
      });
    }

    const conversation = await chatService.startHierarchyChat(
      req.user._id,
      targetUserId,
      subject || ''
    );

    res.status(201).json({
      success: true,
      message: 'Conversation started',
      data: chatService.formatConversation(conversation, req.user._id),
    });
  })
);

/**
 * @route   POST /api/chat/conversations/:id/close
 * @desc    Close a conversation
 * @access  Private (Participants or Admin)
 * @body    { reason: string }
 */
router.post('/conversations/:id/close', asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const conversation = await chatService.closeConversation(
    req.params.id,
    req.user._id,
    reason
  );

  res.json({
    success: true,
    message: 'Conversation closed',
    data: { id: conversation._id, status: conversation.status },
  });
}));

/**
 * @route   GET /api/chat/conversations/:id/messages
 * @desc    Get messages for a conversation
 * @access  Private (Participants only)
 * @query   before, after, limit
 */
router.get('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const { before, after, limit } = req.query;

  const messages = await chatService.getMessages(
    req.params.id,
    req.user._id,
    {
      before,
      after,
      limit: parseInt(limit) || 50,
    }
  );

  res.json({
    success: true,
    count: messages.length,
    data: messages,
  });
}));

/**
 * @route   POST /api/chat/conversations/:id/messages
 * @desc    Send a message
 * @access  Private (Participants only)
 * @body    { content: string, type?: string, attachments?: [], replyTo?: string, priority?: string }
 */
router.post('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const { content, type, attachments, replyTo, priority, clientMessageId } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message content is required',
    });
  }

  const message = await chatService.sendMessage(
    req.params.id,
    req.user._id,
    {
      content: content.trim(),
      type: type || 'text',
      attachments: attachments || [],
      replyTo,
      priority: priority || 'normal',
      clientMessageId,
      platform: req.headers['x-platform'] || 'web',
    }
  );

  res.status(201).json({
    success: true,
    data: message,
  });
}));

/**
 * @route   PUT /api/chat/messages/:id
 * @desc    Edit a message
 * @access  Private (Sender only)
 * @body    { content: string }
 */
router.put('/messages/:id', asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message content is required',
    });
  }

  const message = await chatService.editMessage(
    req.params.id,
    req.user._id,
    content.trim()
  );

  res.json({
    success: true,
    message: 'Message updated',
    data: message,
  });
}));

/**
 * @route   DELETE /api/chat/messages/:id
 * @desc    Delete a message
 * @access  Private (Sender only)
 */
router.delete('/messages/:id', asyncHandler(async (req, res) => {
  await chatService.deleteMessage(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Message deleted',
  });
}));

/**
 * @route   PUT /api/chat/conversations/:id/read
 * @desc    Mark conversation as read
 * @access  Private (Participants only)
 * @body    { lastMessageId?: string }
 */
router.put('/conversations/:id/read', asyncHandler(async (req, res) => {
  const { lastMessageId } = req.body;

  await chatService.markAsRead(
    req.params.id,
    req.user._id,
    lastMessageId
  );

  res.json({
    success: true,
    message: 'Marked as read',
  });
}));

/**
 * @route   GET /api/chat/unread-count
 * @desc    Get total unread message count
 * @access  Private
 */
router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await chatService.getUnreadCount(req.user._id);

  res.json({
    success: true,
    data: { unreadCount: count },
  });
}));

/**
 * @route   GET /api/chat/targets
 * @desc    Get available chat targets for hierarchy chats
 * @access  Private (Officials only)
 */
router.get('/targets',
  authorize('uc_chairman', 'town_chairman', 'mayor', 'website_admin'),
  asyncHandler(async (req, res) => {
    const targets = await chatService.getAvailableChatTargets(req.user._id);

    res.json({
      success: true,
      count: targets.length,
      data: targets,
    });
  })
);

/**
 * @route   GET /api/chat/complaint/:complaintId/access
 * @desc    Check if user can chat about a complaint
 * @access  Private
 */
router.get('/complaint/:complaintId/access', asyncHandler(async (req, res) => {
  const access = await chatService.canChatAboutComplaint(
    req.params.complaintId,
    req.user._id
  );

  res.json({
    success: true,
    data: access,
  });
}));

/**
 * @route   GET /api/chat/complaint/:complaintId/conversation
 * @desc    Get conversation for a complaint (if exists)
 * @access  Private
 */
router.get('/complaint/:complaintId/conversation', asyncHandler(async (req, res) => {
  const conversation = await chatService.getComplaintConversation(
    req.params.complaintId
  );

  if (!conversation) {
    return res.json({
      success: true,
      data: null,
      message: 'No conversation exists for this complaint',
    });
  }

  // Check if user is participant
  if (!conversation.isParticipant(req.user._id)) {
    return res.status(403).json({
      success: false,
      error: 'You are not a participant in this conversation',
    });
  }

  res.json({
    success: true,
    data: chatService.formatConversation(conversation, req.user._id),
  });
}));

module.exports = router;
