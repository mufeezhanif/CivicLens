import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');

// ============================================================
// Singleton Socket Manager — one connection shared across all hooks
// ============================================================
class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.error = null;
    this.listeners = new Set(); // external store subscribers
    this.refCount = 0; // how many hook instances are mounted
  }

  /** Notify React of state changes via useSyncExternalStore */
  _notify() {
    this.listeners.forEach((cb) => cb());
  }

  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getSnapshot() {
    return { connected: this.connected, error: this.error };
  }

  /** Acquire a reference — connects on first consumer */
  acquire() {
    this.refCount++;
    if (this.refCount === 1) this.connect();
  }

  /** Release a reference — disconnects when last consumer unmounts */
  release() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) this.disconnect();
  }

  connect() {
    // Guard: already connected or in progress
    if (this.socket) return;

    const token = localStorage.getItem('accessToken');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.connected = true;
      this.error = null;
      this._notify();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.connected = false;
      this._notify();
    });

    this.socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
      this.error = err.message;
      this.connected = false;
      this._notify();
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.error = null;
      this._notify();
    }
  }

  /** Reconnect with a fresh token (call after login) */
  reconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this._notify();
    if (this.refCount > 0) this.connect();
  }

  getSocket() {
    return this.socket;
  }
}

// Module-level singleton
const socketManager = new SocketManager();

/**
 * WebSocket hook for real-time updates
 * All calls share the same underlying socket connection.
 */
export function useWebSocket(options = {}) {
  // Subscribe to singleton state
  const { connected: isConnected, error } = useSyncExternalStore(
    (cb) => socketManager.subscribe(cb),
    () => socketManager.getSnapshot(),
  );

  // Acquire / release on mount / unmount
  useEffect(() => {
    if (options.autoConnect !== false) {
      socketManager.acquire();
      return () => socketManager.release();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = useCallback((event, data) => {
    const s = socketManager.getSocket();
    if (s?.connected) s.emit(event, data);
  }, []);

  /**
   * Subscribe to a socket event.
   * Returns an unsubscribe function that correctly removes the listener.
   */
  const subscribe = useCallback((event, callback) => {
    const s = socketManager.getSocket();
    if (!s) return () => {};

    // Keep a stable reference for both on/off
    const handler = (data) => callback(data);
    s.on(event, handler);

    return () => {
      s.off(event, handler);
    };
  }, []);

  const unsubscribe = useCallback((event, handler) => {
    const s = socketManager.getSocket();
    if (s) s.off(event, handler);
  }, []);

  const joinRoom = useCallback((room) => { emit('subscribe', room); }, [emit]);
  const leaveRoom = useCallback((room) => { emit('unsubscribe', room); }, [emit]);

  return {
    isConnected,
    error,
    connect: () => socketManager.acquire(),
    disconnect: () => socketManager.release(),
    reconnect: () => socketManager.reconnect(),
    emit,
    subscribe,
    unsubscribe,
    joinRoom,
    leaveRoom,
    getSocket: () => socketManager.getSocket(),
  };
}

// Export manager so other code can force reconnect (e.g. after login)
export { socketManager };

/**
 * Hook for tracking complaint status updates in real-time
 */
export function useComplaintTracking(complaintId) {
  const { isConnected, subscribe, emit } = useWebSocket();
  const [status, setStatus] = useState(null);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (!complaintId || !isConnected) return;

    // Track this complaint
    emit('track:complaint', complaintId);

    // Listen for status updates
    const unsubscribe = subscribe('complaint:statusUpdate', (data) => {
      if (data.complaintId === complaintId || data._id === complaintId) {
        setStatus(data.status);
        setUpdates((prev) => [...prev, data]);
      }
    });

    return () => {
      emit('untrack:complaint', complaintId);
      unsubscribe();
    };
  }, [complaintId, isConnected, emit, subscribe]);

  return { status, updates, isConnected };
}

/**
 * Hook for dashboard real-time updates
 */
export function useDashboardUpdates(entityType, entityId) {
  const { isConnected, subscribe, emit } = useWebSocket();
  const [statsUpdate, setStatsUpdate] = useState(null);
  const [newComplaints, setNewComplaints] = useState([]);
  const [slaBreaches, setSlaBreaches] = useState([]);
  const [escalations, setEscalations] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to dashboard updates
    emit('subscribe:dashboard');

    // Subscribe to relevant rooms
    if (entityType && entityId) {
      emit('subscribe', `${entityType}:${entityId}`);
    }

    // Listen for various events
    const unsubStats = subscribe('dashboard:update', (data) => {
      setStatsUpdate(data);
    });

    const unsubNew = subscribe('complaint:new', (data) => {
      setNewComplaints((prev) => [data, ...prev].slice(0, 10));
    });

    const unsubSLA = subscribe('complaint:slaBreach', (data) => {
      setSlaBreaches((prev) => [data, ...prev].slice(0, 10));
    });

    const unsubEsc = subscribe('complaint:escalated', (data) => {
      setEscalations((prev) => [data, ...prev].slice(0, 10));
    });

    return () => {
      unsubStats();
      unsubNew();
      unsubSLA();
      unsubEsc();
    };
  }, [isConnected, entityType, entityId, emit, subscribe]);

  const clearAlerts = useCallback((type) => {
    switch (type) {
      case 'new':
        setNewComplaints([]);
        break;
      case 'sla':
        setSlaBreaches([]);
        break;
      case 'escalation':
        setEscalations([]);
        break;
      default:
        setNewComplaints([]);
        setSlaBreaches([]);
        setEscalations([]);
    }
  }, []);

  return {
    isConnected,
    statsUpdate,
    newComplaints,
    slaBreaches,
    escalations,
    clearAlerts,
  };
}

/**
 * Hook for citizen notifications
 */
export function useCitizenNotifications() {
  const { isConnected, subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isConnected) return;

    const unsubStatus = subscribe('complaint:statusUpdate', (data) => {
      const notification = {
        id: Date.now(),
        type: 'status_update',
        title: 'Complaint Status Updated',
        message: `Your complaint ${data.complaintId} status changed to ${data.status}`,
        data,
        read: false,
        timestamp: new Date().toISOString(),
      };

      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          tag: data.complaintId,
        });
      }
    });

    return () => {
      unsubStatus();
    };
  }, [isConnected, subscribe]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isConnected,
  };
}

export default {
  useWebSocket,
  useComplaintTracking,
  useDashboardUpdates,
  useCitizenNotifications,
};
