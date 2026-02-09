import React from 'react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Conversation List Item
 * Displays a single conversation in the list
 */
const ConversationListItem = ({ 
  conversation, 
  isActive, 
  onClick 
}) => {
  const {
    title,
    type,
    otherParticipant,
    lastMessage,
    unreadCount,
    status,
    complaintNumber,
    updatedAt,
  } = conversation;

  const isUnread = unreadCount > 0;
  const isClosed = status === 'closed';

  // Format time
  const timeAgo = lastMessage?.sentAt 
    ? formatDistanceToNow(new Date(lastMessage.sentAt), { addSuffix: true })
    : formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  // Role badge colors
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'uc_chairman':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'town_chairman':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'mayor':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'citizen':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Type icon element
  const typeIcon = type === 'complaint' ? (
    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 text-left transition-all duration-200
        border-b border-gray-100 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-700/50
        focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700/50
        ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}
        ${isClosed ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon/Avatar */}
        <div className={`
          shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${type === 'complaint' 
            ? 'bg-orange-100 dark:bg-orange-900/30' 
            : 'bg-blue-100 dark:bg-blue-900/30'}
        `}>
          {typeIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`
              truncate text-sm font-medium
              ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}
            `}>
              {title}
            </h4>
            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
              {timeAgo}
            </span>
          </div>

          {/* Participant info */}
          {otherParticipant && (
            <div className="flex items-center gap-2 mb-1">
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${getRoleBadgeClass(otherParticipant.role)}
              `}>
                {otherParticipant.displayName}
              </span>
            </div>
          )}

          {/* Complaint number */}
          {complaintNumber && (
            <span className="text-xs text-orange-600 dark:text-orange-400 font-mono">
              #{complaintNumber}
            </span>
          )}

          {/* Last message preview */}
          <p className={`
            text-sm truncate mt-1
            ${isUnread 
              ? 'text-gray-900 dark:text-gray-200 font-medium' 
              : 'text-gray-500 dark:text-gray-400'}
          `}>
            {lastMessage?.isSystem ? (
              <span className="italic">{lastMessage.content}</span>
            ) : (
              lastMessage?.content || 'No messages yet'
            )}
          </p>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-2">
            {isClosed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 
                dark:bg-gray-600 dark:text-gray-300">
                Closed
              </span>
            )}
            {isUnread && (
              <span className="flex items-center justify-center min-w-5 h-5 px-1.5 
                text-xs font-bold text-white bg-blue-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

/**
 * Conversation List Component
 * Displays list of conversations with filtering
 */
const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  onNewChat,
  filter,
  onFilterChange,
}) => {
  const filters = [
    { value: 'all', label: 'All' },
    { value: 'complaint', label: 'Complaints' },
    { value: 'hierarchy', label: 'Officials' },
  ];

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    return conv.type === filter;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Messages
          </h2>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full 
                dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
              title="New conversation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange?.(f.value)}
              className={`
                flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${filter === f.value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          // Loading skeleton
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all' 
                ? 'No conversations yet' 
                : `No ${filter} conversations`}
            </p>
          </div>
        ) : (
          // Conversation list
          filteredConversations.map(conversation => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={activeConversationId === conversation.id}
              onClick={() => onSelectConversation(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
