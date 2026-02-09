import React, { useState, useEffect, useCallback } from 'react';
import { useChat, useChatTargets } from '../../hooks/useChat';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import toast from 'react-hot-toast';

/**
 * New Chat Modal
 * Modal for starting new hierarchy conversations
 */
const NewChatModal = ({ isOpen, onClose, targets, onStartChat, loading }) => {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [subject, setSubject] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedTarget) {
      onStartChat(selectedTarget.id, subject);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            New Conversation
          </h3>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Target selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select recipient
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {targets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No available recipients
                </p>
              ) : (
                targets.map(target => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedTarget(target)}
                    className={`
                      w-full p-3 text-left rounded-lg border transition-colors
                      ${selectedTarget?.id === target.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}
                    `}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {target.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {target.roleDisplay}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject (optional)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What would you like to discuss?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTarget || loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Starting...' : 'Start Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Chat Panel Component
 * Full chat interface with conversation list and chat window
 */
const ChatPanel = ({ className = '' }) => {
  const {
    conversations,
    conversation,
    messages,
    // totalUnread - available for notifications badge
    loading,
    error,
    sending,
    hasMore,
    fetchConversations,
    fetchConversation,
    fetchMessages,
    sendMessage,
    startHierarchyChat,
    closeConversation,
    markAsRead,
    sendTyping,
    loadMoreMessages,
    leaveConversation,
    clearError,
  } = useChat();

  const { targets, loading: targetsLoading } = useChatTargets();

  const [filter, setFilter] = useState('all');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(async (conv) => {
    await fetchConversation(conv.id);
    await fetchMessages(conv.id);
    setShowMobileChat(true);
  }, [fetchConversation, fetchMessages]);

  // Handle back on mobile
  const handleBack = useCallback(() => {
    leaveConversation();
    setShowMobileChat(false);
  }, [leaveConversation]);

  // Handle new chat
  const handleNewChat = useCallback(async (targetId, subject) => {
    try {
      const conv = await startHierarchyChat(targetId, subject);
      setShowNewChatModal(false);
      await handleSelectConversation(conv);
      toast.success('Conversation started');
    } catch {
      // Error handled by hook
    }
  }, [startHierarchyChat, handleSelectConversation]);

  // Handle close conversation
  const handleCloseConversation = useCallback(async (conversationId) => {
    if (window.confirm('Are you sure you want to close this conversation?')) {
      await closeConversation(conversationId);
      toast.success('Conversation closed');
    }
  }, [closeConversation]);

  return (
    <div className={`flex h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Conversation List */}
      <div className={`
        w-full lg:w-80 lg:border-r border-gray-200 dark:border-gray-700
        ${showMobileChat ? 'hidden lg:block' : 'block'}
      `}>
        <ConversationList
          conversations={conversations}
          activeConversationId={conversation?.id}
          onSelectConversation={handleSelectConversation}
          loading={loading && !conversation}
          onNewChat={() => setShowNewChatModal(true)}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Chat Window */}
      <div className={`
        flex-1 flex flex-col
        ${showMobileChat ? 'block' : 'hidden lg:flex'}
      `}>
        <ChatWindow
          conversation={conversation}
          messages={messages}
          loading={loading}
          sending={sending}
          hasMore={hasMore}
          onSendMessage={sendMessage}
          onLoadMore={loadMoreMessages}
          onMarkAsRead={markAsRead}
          onTyping={sendTyping}
          onClose={handleBack}
          onCloseConversation={handleCloseConversation}
          isClosed={conversation?.status === 'closed'}
        />
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        targets={targets}
        onStartChat={handleNewChat}
        loading={targetsLoading}
      />
    </div>
  );
};

export default ChatPanel;
