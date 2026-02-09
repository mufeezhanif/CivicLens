import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';

/**
 * Floating chat widget component
 * Displays a chat bubble button and toggles the chat window
 */
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip on first visit
  useEffect(() => {
    const hasSeenChat = localStorage.getItem('civiclens_chat_seen');
    if (!hasSeenChat) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem('civiclens_chat_seen', 'true');
        }, 5000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setHasUnread(false);
    setShowTooltip(false);
  };

  // Handle escape key to close chat
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      {showTooltip && !isOpen && (
        <div className="absolute bottom-20 right-0 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg 
          animate-bounce text-sm whitespace-nowrap">
          Need help? Chat with our AI assistant!
          <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gray-900"></div>
        </div>
      )}

      {/* Chat Window */}
      <div className={`absolute bottom-20 right-0 transition-all duration-300 ease-in-out
        ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <ChatWindow 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
        />
      </div>

      {/* Floating button */}
      <button
        onClick={toggleChat}
        className={`
          group relative w-16 h-16 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800
          ${isOpen 
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0' 
            : 'bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
          }
        `}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* Unread indicator */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
            flex items-center justify-center text-xs text-white font-bold animate-pulse">
            1
          </span>
        )}

        {/* Icon container with transition */}
        <div className="relative w-7 h-7">
          {/* Chat icon */}
          <svg 
            className={`absolute inset-0 w-7 h-7 text-white transition-all duration-300
              ${isOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>

          {/* Close icon */}
          <svg 
            className={`absolute inset-0 w-7 h-7 text-white transition-all duration-300
              ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </div>

        {/* Ripple effect on hover */}
        <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 
          transition-opacity duration-300"></span>
      </button>

      {/* Pulse animation ring */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25 
          pointer-events-none"></span>
      )}
    </div>
  );
};

export default ChatWidget;
