import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to manage PWA service worker registration and updates
 */
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  });
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Register service worker
    const registerServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        });

        // Handle controller change (after skipWaiting)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerServiceWorker();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  const updateApp = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  const checkForUpdates = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  return {
    isInstalled,
    canInstall: !!installPrompt,
    isUpdateAvailable,
    installApp,
    updateApp,
    checkForUpdates,
  };
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        if ('serviceWorker' in navigator && 'sync' in window.SyncManager) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.sync.register('sync-complaints');
          });
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

/**
 * Hook for push notification management
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
    return Notification.permission;
  });
  const [subscription, setSubscription] = useState(null);
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  });
  const subscriptionRef = useRef(null);

  const subscribeToPush = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const response = await fetch('/api/v1/notifications/vapid-key');
      
      if (!response.ok) {
        console.warn('VAPID key not available');
        return null;
      }

      const { publicKey } = await response.json();
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      setSubscription(sub);
      subscriptionRef.current = sub;

      // Send subscription to server
      await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      return sub;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await subscribeToPush();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, [isSupported, subscribeToPush]);

  const unsubscribe = useCallback(async () => {
    const sub = subscription || subscriptionRef.current;
    if (sub) {
      await sub.unsubscribe();
      setSubscription(null);
      subscriptionRef.current = null;
      
      // Notify server
      await fetch('/api/v1/notifications/unsubscribe', {
        method: 'POST',
      });
    }
  }, [subscription]);

  return {
    permission,
    isSupported,
    isSubscribed: !!subscription,
    requestPermission,
    unsubscribe,
  };
}

/**
 * Hook for offline data storage using IndexedDB
 */
export function useOfflineStorage() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    const openDatabase = () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('CivicLensOffline', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const database = event.target.result;

          if (!database.objectStoreNames.contains('pendingComplaints')) {
            database.createObjectStore('pendingComplaints', { 
              keyPath: 'id', 
              autoIncrement: true 
            });
          }

          if (!database.objectStoreNames.contains('cachedData')) {
            database.createObjectStore('cachedData', { keyPath: 'key' });
          }

          if (!database.objectStoreNames.contains('draftComplaints')) {
            database.createObjectStore('draftComplaints', { 
              keyPath: 'id', 
              autoIncrement: true 
            });
          }
        };
      });
    };

    openDatabase().then(setDb).catch(console.error);
  }, []);

  const saveDraft = useCallback(async (complaint) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('draftComplaints', 'readwrite');
      const store = tx.objectStore('draftComplaints');
      
      const request = store.put({
        ...complaint,
        savedAt: new Date().toISOString(),
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  const getDrafts = useCallback(async () => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction('draftComplaints', 'readonly');
      const store = tx.objectStore('draftComplaints');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  const deleteDraft = useCallback(async (id) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('draftComplaints', 'readwrite');
      const store = tx.objectStore('draftComplaints');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  const queueComplaint = useCallback(async (complaint, authToken) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingComplaints', 'readwrite');
      const store = tx.objectStore('pendingComplaints');
      
      const request = store.add({
        data: complaint,
        authToken,
        createdAt: new Date().toISOString(),
      });

      request.onsuccess = () => {
        // Register sync
        if ('serviceWorker' in navigator && 'sync' in window.SyncManager) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.sync.register('sync-complaints');
          });
        }
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  const getPendingComplaints = useCallback(async () => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingComplaints', 'readonly');
      const store = tx.objectStore('pendingComplaints');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  const cacheData = useCallback(async (key, data, ttl = 3600000) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('cachedData', 'readwrite');
      const store = tx.objectStore('cachedData');
      
      const request = store.put({
        key,
        data,
        expires: Date.now() + ttl,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  const getCachedData = useCallback(async (key) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('cachedData', 'readonly');
      const store = tx.objectStore('cachedData');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expires > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  return {
    saveDraft,
    getDrafts,
    deleteDraft,
    queueComplaint,
    getPendingComplaints,
    cacheData,
    getCachedData,
  };
}

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default {
  usePWA,
  useOnlineStatus,
  usePushNotifications,
  useOfflineStorage,
};
