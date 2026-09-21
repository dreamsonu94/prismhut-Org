/**
 * Network Connectivity Context
 * Detects online/offline states and triggers reconnection alerts.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../constants/config';

interface NetworkContextType {
  isOnline: boolean;
  isBackendReachable: boolean;
  checkConnectivity: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isBackendReachable: true,
  checkConnectivity: async () => true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isBackendReachable, setIsBackendReachable] = useState<boolean>(true);

  const checkConnectivity = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const reachable = res.ok;
      setIsBackendReachable(reachable);
      return reachable;
    } catch {
      setIsBackendReachable(false);
      return false;
    }
  };

  useEffect(() => {
    // Browser / WebView event listeners
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBackendReachable(false);
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Periodic heartbeat check (every 30s)
    const interval = setInterval(checkConnectivity, 30000);
    checkConnectivity();

    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      clearInterval(interval);
    };
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isBackendReachable,
        checkConnectivity,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
