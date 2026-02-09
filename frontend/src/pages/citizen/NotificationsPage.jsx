/**
 * Notifications Page
 * View and manage user notifications
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Spinner,
  EmptyState
} from '../../components/ui';
import useUiStore from '../../store/uiStore';

// Icons
const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Notification type icons
const getNotificationIcon = (type) => {
  switch (type) {
    case 'status_update':
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      );
    case 'comment':
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
    case 'assignment':
      return (
        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      );
    case 'system':
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <BellIcon />
        </div>
      );
  }
};

// Format relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    type: 'status_update',
    title: 'Complaint Status Updated',
    message: 'Your complaint "Pothole on Main Street" has been marked as In Progress.',
    link: '/citizen/complaints/123',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: '2',
    type: 'comment',
    title: 'New Comment',
    message: 'An official has replied to your complaint "Street Light Not Working".',
    link: '/citizen/complaints/124',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    type: 'assignment',
    title: 'Complaint Assigned',
    message: 'Your complaint has been assigned to Township Officer John Doe.',
    link: '/citizen/complaints/125',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '4',
    type: 'status_update',
    title: 'Complaint Resolved',
    message: 'Your complaint "Garbage Collection Issue" has been marked as Resolved.',
    link: '/citizen/complaints/126',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: '5',
    type: 'system',
    title: 'Welcome to CivicLens',
    message: 'Thank you for joining CivicLens. Start by reporting an issue in your area.',
    link: '/citizen/report',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

const NotificationItem = ({ notification, onMarkRead, onDelete }) => (
  <div 
    className={`flex gap-4 p-4 border-b border-foreground/5 hover:bg-foreground/5 transition-colors ${
      !notification.read ? 'bg-primary/5' : ''
    }`}
  >
    {getNotificationIcon(notification.type)}
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-medium text-foreground">{notification.title}</h4>
          <p className="text-sm text-foreground/60 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        </div>
        {!notification.read && (
          <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
        )}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <span className="text-xs text-foreground/40">
          {formatRelativeTime(notification.createdAt)}
        </span>
        {notification.link && (
          <Link 
            to={notification.link}
            className="text-xs text-primary hover:underline"
          >
            View Details
          </Link>
        )}
      </div>
    </div>
    <div className="flex items-start gap-1">
      {!notification.read && (
        <button
          onClick={() => onMarkRead(notification.id)}
          className="p-2 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          title="Mark as read"
        >
          <CheckIcon />
        </button>
      )}
      <button
        onClick={() => onDelete(notification.id)}
        className="p-2 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete"
      >
        <TrashIcon />
      </button>
    </div>
  </div>
);

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const { setUnreadCount } = useUiStore();

  // Fetch notifications
  useEffect(() => {
    // Simulate API call
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // In production, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter((n) => !n.read).length);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [setUnreadCount]);

  // Mark notification as read
  const handleMarkRead = (id) => {
    setNotifications(notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(notifications.filter((n) => !n.read && n.id !== id).length);
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Delete notification
  const handleDelete = (id) => {
    const notification = notifications.find((n) => n.id === id);
    setNotifications(notifications.filter((n) => n.id !== id));
    if (!notification?.read) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Filtered notifications
  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-foreground/60 mt-1">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-foreground/5 rounded-xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <Badge variant="primary" size="sm" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <Card>
        {loading ? (
          <CardContent className="py-12">
            <div className="flex justify-center">
              <Spinner size="lg" />
            </div>
          </CardContent>
        ) : filteredNotifications.length === 0 ? (
          <CardContent className="py-12">
            <EmptyState
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              description={filter === 'unread' 
                ? "You've read all your notifications"
                : "You don't have any notifications yet"
              }
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-foreground/5">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
