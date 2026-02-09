import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApi } from '../services/api';
import { useWebSocket } from './useWebSocket';

/**
 * Hook for managing chat conversations
 * Handles real-time updates, message sending, and conversation management
 */
export function useChat() {
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { isConnected, emit, subscribe } = useWebSocket();
  const currentConversationId = useRef(null);

  // Fetch conversations
  const fetchConversations = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.getConversations(options);
      setConversations(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single conversation
  const fetchConversation = useCallback(async (conversationId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.getConversation(conversationId);
      setConversation(response.data);
      currentConversationId.current = conversationId;
      
      // Join the conversation room for real-time updates
      emit('chat:join', conversationId);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load conversation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [emit]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.getMessages(conversationId, options);
      const newMessages = response.data;
      
      if (options.before) {
        // Prepend older messages
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      } else if (options.after) {
        // Append newer messages
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        // Initial load - newest first from API, so reverse for display
        setMessages(newMessages.reverse());
      }
      
      setHasMore(newMessages.length >= (options.limit || 50));
      return newMessages;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (conversationId, content, options = {}) => {
    if (!content.trim()) return null;
    
    setSending(true);
    setError(null);
    
    // Optimistic update - add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversationId,
      content,
      type: options.type || 'text',
      isOwn: true,
      status: 'sending',
      createdAt: new Date().toISOString(),
      ...options
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const response = await chatApi.sendMessage(conversationId, {
        content,
        type: options.type || 'text',
        attachments: options.attachments,
        replyTo: options.replyTo,
        priority: options.priority,
        clientMessageId: tempId,
      });
      
      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? response.data : msg)
      );
      
      return response.data;
    } catch (err) {
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      setError(err.response?.data?.error || 'Failed to send message');
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  // Start complaint chat (UC Chairman only)
  const startComplaintChat = useCallback(async (complaintId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.startComplaintChat(complaintId);
      const conv = response.data;
      
      // Add to conversations list if not already there
      setConversations(prev => {
        const exists = prev.some(c => c.id === conv.id);
        if (!exists) {
          return [conv, ...prev];
        }
        return prev;
      });
      
      return conv;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start chat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start hierarchy chat
  const startHierarchyChat = useCallback(async (targetUserId, subject = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.startHierarchyChat(targetUserId, subject);
      const conv = response.data;
      
      setConversations(prev => {
        const exists = prev.some(c => c.id === conv.id);
        if (!exists) {
          return [conv, ...prev];
        }
        return prev;
      });
      
      return conv;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start chat');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Close conversation
  const closeConversation = useCallback(async (conversationId, reason = '') => {
    try {
      await chatApi.closeConversation(conversationId, reason);
      
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId ? { ...c, status: 'closed' } : c
        )
      );
      
      if (conversation?.id === conversationId) {
        setConversation(prev => ({ ...prev, status: 'closed' }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close conversation');
    }
  }, [conversation]);

  // Mark as read
  const markAsRead = useCallback(async (conversationId, lastMessageId = null) => {
    try {
      await chatApi.markAsRead(conversationId, lastMessageId);
      emit('chat:markRead', { conversationId, lastMessageId });
      
      // Update unread count in conversations list
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
      
      // Recalculate total unread
      setTotalUnread(prev => {
        const conv = conversations.find(c => c.id === conversationId);
        return Math.max(0, prev - (conv?.unreadCount || 0));
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [emit, conversations]);

  // Send typing indicator
  const sendTyping = useCallback((conversationId, isTyping) => {
    emit('chat:typing', { conversationId, isTyping });
  }, [emit]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || messages.length === 0 || !conversation) return;
    
    const oldestMessage = messages[0];
    await fetchMessages(conversation.id, { before: oldestMessage.id, limit: 50 });
  }, [loading, hasMore, messages, conversation, fetchMessages]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await chatApi.getUnreadCount();
      setTotalUnread(response.data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // Leave conversation room on cleanup
  const leaveConversation = useCallback(() => {
    if (currentConversationId.current) {
      emit('chat:leave', currentConversationId.current);
      currentConversationId.current = null;
    }
    setConversation(null);
    setMessages([]);
  }, [emit]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    // New message received
    const unsubNewMsg = subscribe('chat:newMessage', (data) => {
      // Update messages if viewing this conversation
      if (data.conversationId === currentConversationId.current) {
        setMessages(prev => {
          // Check for duplicate (optimistic update)
          const exists = prev.some(
            m => m.id === data.message.id || 
                 m.metadata?.clientMessageId === data.message.metadata?.clientMessageId
          );
          if (exists) return prev;
          return [...prev, data.message];
        });
      }
      
      // Update conversation in list
      setConversations(prev => 
        prev.map(c => {
          if (c.id === data.conversationId) {
            return {
              ...c,
              lastMessage: {
                content: data.message.content.substring(0, 100),
                senderId: data.message.senderId,
                senderRole: data.message.senderRole,
                sentAt: data.message.createdAt,
              },
              unreadCount: data.conversationId !== currentConversationId.current 
                ? (c.unreadCount || 0) + 1 
                : c.unreadCount,
            };
          }
          return c;
        })
      );
      
      // Update total unread if not viewing this conversation
      if (data.conversationId !== currentConversationId.current) {
        setTotalUnread(prev => prev + 1);
      }
    });

    // New conversation created
    const unsubNewConv = subscribe('chat:conversationCreated', (data) => {
      setConversations(prev => {
        const exists = prev.some(c => c.id === data.conversation.id);
        if (!exists) {
          return [data.conversation, ...prev];
        }
        return prev;
      });
    });

    // Typing indicator
    const unsubTyping = subscribe('chat:typing', () => {
      // Could update UI to show typing indicator
      // This would require additional state to track which users are typing
    });

    // Message read
    const unsubRead = subscribe('chat:read', (data) => {
      // Update message read status
      if (data.conversationId === currentConversationId.current) {
        setMessages(prev => 
          prev.map(msg => ({
            ...msg,
            readBy: [...(msg.readBy || []), { userId: data.userId, readAt: data.readAt }]
          }))
        );
      }
    });

    // Message edited
    const unsubEdited = subscribe('chat:messageEdited', (data) => {
      if (data.conversationId === currentConversationId.current) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, content: data.content, isEdited: true, editedAt: data.editedAt }
              : msg
          )
        );
      }
    });

    // Message deleted
    const unsubDeleted = subscribe('chat:messageDeleted', (data) => {
      if (data.conversationId === currentConversationId.current) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, isDeleted: true, content: 'This message has been deleted' }
              : msg
          )
        );
      }
    });

    // Conversation closed
    const unsubClosed = subscribe('chat:conversationClosed', (data) => {
      setConversations(prev => 
        prev.map(c => 
          c.id === data.conversationId ? { ...c, status: 'closed' } : c
        )
      );
      
      if (currentConversationId.current === data.conversationId) {
        setConversation(prev => ({ ...prev, status: 'closed' }));
      }
    });

    return () => {
      unsubNewMsg();
      unsubNewConv();
      unsubTyping();
      unsubRead();
      unsubEdited();
      unsubDeleted();
      unsubClosed();
    };
  }, [isConnected, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveConversation();
    };
  }, [leaveConversation]);

  return {
    // State
    conversations,
    conversation,
    messages,
    totalUnread,
    loading,
    error,
    sending,
    hasMore,
    isConnected,
    
    // Actions
    fetchConversations,
    fetchConversation,
    fetchMessages,
    sendMessage,
    startComplaintChat,
    startHierarchyChat,
    closeConversation,
    markAsRead,
    sendTyping,
    loadMoreMessages,
    fetchUnreadCount,
    leaveConversation,
    
    // Utilities
    clearError: () => setError(null),
  };
}

/**
 * Hook for getting chat targets (officials only)
 */
export function useChatTargets() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.getChatTargets();
      setTargets(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load chat targets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return { targets, loading, error, refetch: fetchTargets };
}

/**
 * Hook for checking complaint chat access
 */
export function useComplaintChatAccess(complaintId) {
  const [access, setAccess] = useState({ allowed: false, canInitiate: false });
  const [existingConversation, setExistingConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!complaintId) {
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      setLoading(true);
      try {
        const [accessRes, convRes] = await Promise.all([
          chatApi.checkComplaintAccess(complaintId),
          chatApi.getComplaintConversation(complaintId),
        ]);
        
        setAccess(accessRes.data);
        setExistingConversation(convRes.data);
      } catch (err) {
        console.error('Failed to check chat access:', err);
        setAccess({ allowed: false, canInitiate: false });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [complaintId]);

  return { access, existingConversation, loading };
}

export default useChat;
