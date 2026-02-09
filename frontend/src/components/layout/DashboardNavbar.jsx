/**
 * DashboardNavbar Component
 * Top navigation bar for dashboard pages
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useNetwork } from '../../contexts';
import useUiStore from '../../store/uiStore';
import { useWebSocket } from '../../hooks/useWebSocket';

// Icon components
const Icons = {
  Menu: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

const DashboardNavbar = ({ title }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isOnline } = useNetwork();
  const { isConnected: wsConnected } = useWebSocket({ autoConnect: true });
  const { 
    toggleMobileMenu, 
    unreadCount,
    notifications,
    notificationsOpen,
    toggleNotifications,
    closeNotifications,
    markAsRead,
    markAllAsRead,
  } = useUiStore();

  // Determine connection status
  const connectionStatus = !isOnline ? 'offline' : wsConnected ? 'connected' : 'reconnecting';

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        closeNotifications();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeNotifications]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter current page
      console.log('Search:', searchQuery);
    }
  };

  const getProfileLink = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin/profile';
      case 'mayor':
        return '/mayor/profile';
      case 'township_officer':
      case 'uc_chairman':
        return '/official/profile';
      default:
        return '/citizen/profile';
    }
  };

  const getSettingsLink = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin/settings';
      case 'mayor':
        return '/mayor/settings';
      case 'township_officer':
      case 'uc_chairman':
        return '/official/settings';
      default:
        return '/citizen/settings';
    }
  };

  return (
    <>
      {/* Offline Mode Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span>You are offline. Changes will sync when you reconnect.</span>
        </div>
      )}
      
      <header className="bg-white border-b border-foreground/10 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile menu + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 -ml-2 text-foreground/70 hover:bg-foreground/5 rounded-lg"
          >
            <Icons.Menu />
          </button>
          {title && (
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          )}
        </div>

        {/* Center: Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground/40">
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Search complaints, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-foreground/5 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
            />
          </div>
        </form>

        {/* Right: Connection Status + Notifications + User Menu */}
        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/5">
            <div className="relative">
              <div 
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500' 
                    : connectionStatus === 'reconnecting' 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                }`}
              />
              {connectionStatus === 'reconnecting' && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping" />
              )}
            </div>
            <span className="text-xs text-foreground/60">
              {connectionStatus === 'connected' 
                ? 'Live' 
                : connectionStatus === 'reconnecting' 
                  ? 'Reconnecting...' 
                  : 'Offline'}
            </span>
          </div>
          
          {/* Mobile Connection Status (dot only) */}
          <div className="sm:hidden relative p-2">
            <div 
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500' 
                  : connectionStatus === 'reconnecting' 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              title={connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
            />
            {connectionStatus === 'reconnecting' && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping" style={{ top: '8px', left: '8px' }} />
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={toggleNotifications}
              className="relative p-2 text-foreground/70 hover:bg-foreground/5 rounded-lg transition-colors"
            >
              <Icons.Bell />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Panel */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-foreground/10 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-foreground/10 flex items-center justify-between bg-linear-to-r from-primary/5 to-transparent">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-foreground/5 flex items-center justify-center">
                        <Icons.Bell />
                      </div>
                      <p className="text-sm text-foreground/50">No notifications yet</p>
                      <p className="text-xs text-foreground/40 mt-1">We'll notify you about important updates</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`px-4 py-3 border-b border-foreground/5 hover:bg-foreground/5 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                            !notification.read ? 'bg-primary' : 'bg-transparent'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-medium text-foreground' : 'text-foreground/70'}`}>
                              {notification.title || notification.message}
                            </p>
                            {notification.description && (
                              <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">
                                {notification.description}
                              </p>
                            )}
                            <p className="text-xs text-foreground/40 mt-1">
                              {notification.time || 'Just now'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-foreground/10 bg-foreground/5">
                    <Link 
                      to={`${getProfileLink().replace('/profile', '/notifications')}`}
                      onClick={closeNotifications}
                      className="block text-center text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-2 hover:bg-foreground/5 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground line-clamp-1">{user?.name}</p>
              </div>
              <Icons.ChevronDown />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-foreground/10 py-2 z-50">
                <div className="px-4 py-3 border-b border-foreground/10">
                  <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-foreground/50 truncate">{user?.email}</p>
                </div>
                
                <Link
                  to={getProfileLink()}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                >
                  <Icons.User />
                  <span>My Profile</span>
                </Link>
                
                <Link
                  to={getSettingsLink()}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                >
                  <Icons.Settings />
                  <span>Settings</span>
                </Link>
                
                <div className="border-t border-foreground/10 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Icons.Logout />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default DashboardNavbar;
