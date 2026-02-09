/**
 * useNetwork Hook
 * Extracted for Fast Refresh compatibility
 */

import { useContext } from 'react';
import NetworkContext from '../contexts/NetworkContext';

/**
 * Hook to use network context
 */
export function useNetwork() {
  const context = useContext(NetworkContext);
  
  if (!context) {
    // Return default values if used outside provider (for graceful degradation)
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      wasOffline: false,
      isSyncing: false,
      pendingActionsCount: 0,
      queueAction: () => {},
      shouldAttemptRequest: () => true,
      withOfflineSupport: async (fn) => ({ data: await fn() }),
      isSlowConnection: false,
      offlineDuration: 0,
    };
  }
  
  return context;
}
