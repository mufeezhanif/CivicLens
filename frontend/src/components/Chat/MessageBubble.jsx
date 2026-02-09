import React from 'react';
import { format } from 'date-fns';

/**
 * Message Bubble Component
 * Displays a single message in the chat
 */
const MessageBubble = ({ 
  message, 
  showAvatar = true,
  onEdit,
  onDelete,
  onReply,
}) => {
  const {
    content,
    senderDisplayName,
    senderRole,
    type,
    isOwn,
    isEdited,
    isDeleted,
    status,
    createdAt,
    // action - available for future use
    attachments,
    replyTo,
    priority,
  } = message;

  // System messages
  if (type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-400">
          <span className="italic">{content}</span>
          <span className="ml-2 text-xs opacity-75">
            {format(new Date(createdAt), 'h:mm a')}
          </span>
        </div>
      </div>
    );
  }

  // Role colors
  const getRoleColor = (role) => {
    switch (role) {
      case 'uc_chairman':
        return 'text-blue-600 dark:text-blue-400';
      case 'town_chairman':
        return 'text-purple-600 dark:text-purple-400';
      case 'mayor':
        return 'text-amber-600 dark:text-amber-400';
      case 'citizen':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Avatar initials
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || '??';
  };

  // Avatar background color based on role
  const getAvatarBg = (role) => {
    switch (role) {
      case 'uc_chairman':
        return 'bg-blue-500';
      case 'town_chairman':
        return 'bg-purple-500';
      case 'mayor':
        return 'bg-amber-500';
      case 'citizen':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Status icon element
  const getStatusIcon = () => {
    if (status === 'sending') {
      return (
        <svg className="w-3 h-3 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    if (status === 'failed') {
      return (
        <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (status === 'read') {
      return (
        <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (status === 'delivered' || status === 'sent') {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className={`
          shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          text-white text-xs font-medium
          ${getAvatarBg(senderRole)}
        `}>
          {getInitials(senderDisplayName)}
        </div>
      )}
      {!showAvatar && <div className="w-8" />}

      {/* Message content */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showAvatar && (
          <span className={`text-xs font-medium mb-1 ${getRoleColor(senderRole)}`}>
            {senderDisplayName}
          </span>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div className={`
            text-xs px-3 py-1.5 mb-1 rounded-lg border-l-2
            bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600
            text-gray-600 dark:text-gray-400
            ${isOwn ? 'mr-1' : 'ml-1'}
          `}>
            <span className="font-medium">{replyTo.senderDisplayName}</span>
            <p className="truncate">{replyTo.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div 
          className={`
            group relative px-4 py-2.5 rounded-2xl transition-shadow
            ${isOwn 
              ? 'bg-blue-500 text-white rounded-br-md' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'}
            ${priority === 'urgent' ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
            ${priority === 'high' ? 'ring-2 ring-orange-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
            ${isDeleted ? 'opacity-50 italic' : ''}
          `}
        >
          {/* Priority indicator */}
          {priority === 'urgent' && !isDeleted && (
            <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}

          {/* Content */}
          <p className="whitespace-pre-wrap break-all text-sm">
            {content}
          </p>

          {/* Attachments */}
          {attachments?.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((att, idx) => (
                <div key={idx}>
                  {att.type === 'image' ? (
                    <img 
                      src={att.url} 
                      alt="Attachment" 
                      className="max-w-50 rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(att.url, '_blank')}
                    />
                  ) : (
                    <a 
                      href={att.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg
                        ${isOwn 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}
                      `}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm truncate">{att.filename || 'Download'}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hover actions */}
          {!isDeleted && (
            <div className={`
              absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'}
              opacity-0 group-hover:opacity-100 transition-opacity
              flex items-center gap-1
            `}>
              {onReply && (
                <button 
                  onClick={() => onReply(message)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                    dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Reply"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              )}
              {isOwn && onEdit && (
                <button 
                  onClick={() => onEdit(message)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                    dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {isOwn && onDelete && (
                <button 
                  onClick={() => onDelete(message)}
                  className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 
                    dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: time, edited, status */}
        <div className={`
          flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400
          ${isOwn ? 'flex-row-reverse' : ''}
        `}>
          <span>{format(new Date(createdAt), 'h:mm a')}</span>
          {isEdited && <span className="italic">(edited)</span>}
          {isOwn && getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
