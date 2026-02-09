/**
 * Network Status Context
 * Monitors online/offline status and provides network state to the app
 * Simplified version with built-in IndexedDB support
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';

// Create context
const NetworkContext = createContext(null);

// Simple IndexedDB helper (non-hook based to avoid hook-in-hook issues)
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    
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
    };
  });
};

/**
 * Network Status Provider Component
 */
export function NetworkProvider({ children }) {
  // Network state
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionType, setConnectionType] = useState(null);
  const [effectiveType, setEffectiveType] = useState(null);
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now());
  const [lastOfflineTime, setLastOfflineTime] = useState(null);
  
  // Action queue for offline operations
  const [actionQueue, setActionQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const processingRef = useRef(false);
  const dbRef = useRef(null);

  // Initialize IndexedDB (not a hook, runs in useEffect)
  useEffect(() => {
    openDatabase()
      .then(db => { dbRef.current = db; })
      .catch(err => console.warn('[Network] IndexedDB not available:', err));
  }, []);

  // Get pending complaints from IndexedDB
  const getPendingComplaints = useCallback(async () => {
    if (!dbRef.current) return [];
    
    return new Promise((resolve) => {
      try {
        const tx = dbRef.current.transaction('pendingComplaints', 'readonly');
        const store = tx.objectStore('pendingComplaints');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }, []);

  // Cache data in IndexedDB
  const cacheData = useCallback(async (key, data, ttl = 3600000) => {
    if (!dbRef.current) return;
    
    return new Promise((resolve) => {
      try {
        const tx = dbRef.current.transaction('cachedData', 'readwrite');
        const store = tx.objectStore('cachedData');
        
        store.put({ key, data, expires: Date.now() + ttl });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }, []);

  // Get cached data from IndexedDB
  const getCachedData = useCallback(async (key) => {
    if (!dbRef.current) return null;
    
    return new Promise((resolve) => {
      try {
        const tx = dbRef.current.transaction('cachedData', 'readonly');
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
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }, []);

  // Update network information
  const updateNetworkInfo = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.type || null);
      setEffectiveType(connection.effectiveType || null);
    }
  }, []);

  // Handle coming back online
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineTime(Date.now());
    console.log('[Network] Back online');
    updateNetworkInfo();
  }, [updateNetworkInfo]);

  // Handle going offline
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    setLastOfflineTime(Date.now());
    console.log('[Network] Connection lost');
  }, []);

  // Process the action queue when back online
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline) return;
    
    processingRef.current = true;
    setIsSyncing(true);
    
    try {
      // Get pending complaints from IndexedDB
      const pendingComplaints = await getPendingComplaints();
      
      if (pendingComplaints.length > 0) {
        console.log(`[Network] Processing ${pendingComplaints.length} pending complaints...`);
        
        // Process each pending complaint
        for (const pending of pendingComplaints) {
          try {
            // Attempt to sync
            const response = await fetch('/api/v1/complaints', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pending.authToken}`,
              },
              body: JSON.stringify(pending.data),
            });
            
            if (response.ok) {
              console.log(`[Network] Synced complaint: ${pending.id}`);
              // Note: Deletion from IndexedDB should be handled by the service worker
            }
          } catch (error) {
            console.error(`[Network] Failed to sync complaint ${pending.id}:`, error);
          }
        }
      }
      
      // Process custom action queue
      const queue = [...actionQueue];
      setActionQueue([]);
      
      for (const action of queue) {
        try {
          await action.execute();
          console.log(`[Network] Executed queued action: ${action.type}`);
        } catch (error) {
          console.error(`[Network] Failed to execute action ${action.type}:`, error);
          // Re-queue failed actions
          if (action.retries < 3) {
            setActionQueue(prev => [...prev, { ...action, retries: action.retries + 1 }]);
          }
        }
      }
    } finally {
      processingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, actionQueue, getPendingComplaints]);

  // Add action to queue for later execution
  const queueAction = useCallback((type, execute, data = {}) => {
    const action = {
      id: Date.now(),
      type,
      execute,
      data,
      retries: 0,
      createdAt: new Date().toISOString(),
    };
    
    setActionQueue(prev => [...prev, action]);
    console.log(`[Network] Queued action: ${type}`);
    
    return action.id;
  }, []);

  // Remove action from queue
  const removeFromQueue = useCallback((actionId) => {
    setActionQueue(prev => prev.filter(a => a.id !== actionId));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setActionQueue([]);
  }, []);

  // Check if an API call should be attempted
  const shouldAttemptRequest = useCallback(() => {
    if (!isOnline) return false;
    
    // Check for slow connection
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      console.warn('[Network] Slow connection detected');
    }
    
    return true;
  }, [isOnline, effectiveType]);

  // Wrap API call with offline handling
  const withOfflineSupport = useCallback(async (
    apiCall, 
    { 
      fallbackData = null,
      cacheKey = null,
      cacheTTL = 3600000, // 1 hour
      queueIfOffline = false,
      actionType = 'api_call',
    } = {}
  ) => {
    // Try cache first if offline
    if (!isOnline && cacheKey) {
      const cached = await getCachedData(cacheKey);
      if (cached) {
        console.log(`[Network] Serving from cache: ${cacheKey}`);
        return { data: cached, fromCache: true };
      }
    }

    // If offline and should queue
    if (!isOnline && queueIfOffline) {
      queueAction(actionType, apiCall);
      return { queued: true, data: fallbackData };
    }

    // If offline and can't queue, return fallback
    if (!isOnline) {
      return { data: fallbackData, offline: true };
    }

    // Online - make the actual call
    try {
      const data = await apiCall();
      
      // Cache the result if cacheKey provided
      if (cacheKey && data) {
        await cacheData(cacheKey, data, cacheTTL);
      }
      
      return { data, fromCache: false };
    } catch (error) {
      // If request failed due to network, try cache
      if (cacheKey) {
        const cached = await getCachedData(cacheKey);
        if (cached) {
          console.log(`[Network] API failed, serving from cache: ${cacheKey}`);
          return { data: cached, fromCache: true, error };
        }
      }
      
      throw error;
    }
  }, [isOnline, cacheData, getCachedData, queueAction]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for network info changes
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      navigator.connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        navigator.connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [handleOnline, handleOffline, updateNetworkInfo]);

  // Auto-process queue when coming online
  useEffect(() => {
    if (isOnline && actionQueue.length > 0 && !isSyncing) {
      processQueue();
    }
  }, [isOnline, actionQueue.length, isSyncing, processQueue]);

  // Context value
  const value = {
    isOnline,
    wasOffline,
    connectionType,
    effectiveType,
    lastOnlineTime,
    lastOfflineTime,
    isSyncing,
    pendingActionsCount: actionQueue.length,
    queueAction,
    removeFromQueue,
    clearQueue,
    processQueue,
    shouldAttemptRequest,
    withOfflineSupport,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
    offlineDuration: !isOnline && lastOfflineTime ? Date.now() - lastOfflineTime : 0,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export default NetworkContext;
