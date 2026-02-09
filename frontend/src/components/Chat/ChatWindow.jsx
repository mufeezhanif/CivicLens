import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble';

/**
 * Chat Window Component
 * Main chat interface for real-time messaging
 */
const ChatWindow = ({
  conversation,
  messages,
  loading,
  sending,
  hasMore,
  onSendMessage,
  onLoadMore,
  onMarkAsRead,
  onTyping,
  onClose,
  onCloseConversation,
  isClosed,
}) => {
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  // otherTyping state can be set via props from parent component
  const [otherTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversation && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.isOwn) {
        onMarkAsRead?.(conversation.id, lastMessage.id);
      }
    }
  }, [conversation, messages, onMarkAsRead]);

  // Focus input when conversation changes
  useEffect(() => {
    if (conversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loading) {
      onLoadMore?.();
    }
  }, [hasMore, loading, onLoadMore]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping?.(conversation?.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(conversation?.id, false);
    }, 2000);
  }, [conversation?.id, isTyping, onTyping]);

  // Handle message submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending || isClosed) return;

    onSendMessage(conversation.id, messageText.trim(), {
      replyTo: replyingTo?.id,
    });

    setMessageText('');
    setReplyingTo(null);
    setIsTyping(false);
    onTyping?.(conversation?.id, false);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" 
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {conversation.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {conversation.type === 'complaint' && conversation.complaintNumber && (
                <span className="text-orange-600 dark:text-orange-400 font-mono mr-2">
                  #{conversation.complaintNumber}
                </span>
              )}
              {conversation.otherParticipant?.displayName}
              {isClosed && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 
                  text-gray-600 dark:text-gray-300 rounded-full">
                  Closed
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isClosed && onCloseConversation && (
            <button
              onClick={() => onCloseConversation(conversation.id)}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 
                dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close conversation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {/* Load more indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Load more button */}
        {hasMore && !loading && (
          <button
            onClick={onLoadMore}
            className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 
              hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            Load older messages
          </button>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const showAvatar = !prevMessage || 
            prevMessage.senderId !== message.senderId ||
            prevMessage.type === 'system';

          return (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={showAvatar}
              onReply={(msg) => {
                setReplyingTo(msg);
                inputRef.current?.focus();
              }}
            />
          );
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-11">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-gray-500 dark:text-gray-400">
                Replying to <span className="font-medium">{replyingTo.senderDisplayName}</span>
              </span>
            </div>
            <button 
              onClick={cancelReply}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* Input area */}
      {!isClosed ? (
        <form 
          onSubmit={handleSubmit}
          className="p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-2.5 pr-12 bg-gray-100 dark:bg-gray-700 
                  border-0 rounded-2xl resize-none
                  text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  max-h-32 overflow-y-auto"
                style={{ minHeight: '44px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className={`
                shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                transition-all duration-200
                ${messageText.trim() && !sending
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}
              `}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            This conversation has been closed
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
