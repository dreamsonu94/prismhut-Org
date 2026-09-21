/**
 * Real-Time Socket.IO Context for Waiter Mobile Application
 * Subscribes to verified backend events: order.created, order.updated, kot.updated, table.updated, etc.
 */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';
import { useAuth } from './AuthContext';

type SocketEventListener = (data: any) => void;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: string | null;
  subscribe: (event: string, callback: SocketEventListener) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastEvent: null,
  subscribe: () => () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, restaurant } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const listenersRef = useRef<Map<string, Set<SocketEventListener>>>(new Map());

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO Mobile] Connected to server:', socketInstance.id);
      setIsConnected(true);

      // Join restaurant room if present
      if (restaurant?.id) {
        socketInstance.emit('join', `restaurant_${restaurant.id}`);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO Mobile] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.log('[Socket.IO Mobile] Connection error (non-blocking):', err?.message);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[Socket.IO Mobile] Reconnected after attempt:', attemptNumber);
      setIsConnected(true);
      if (restaurant?.id) {
        socketInstance.emit('join', `restaurant_${restaurant.id}`);
      }
    });

    socketInstance.on('reconnect_error', (err) => {
      console.log('[Socket.IO Mobile] Reconnection error:', err?.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.log('[Socket.IO Mobile] Reconnect failed, running in graceful offline/polling mode');
      setIsConnected(false);
    });

    socketInstance.on('error', (err) => {
      console.log('[Socket.IO Mobile] Socket error event:', err);
    });

    const registeredEvents = [
      'order.created',
      'order.updated',
      'kot.created',
      'kot.updated',
      'bot.created',
      'bot.updated',
      'table.updated',
      'payment.completed',
    ];

    registeredEvents.forEach((eventName) => {
      socketInstance.on(eventName, (data) => {
        setLastEvent(eventName);
        const eventListeners = listenersRef.current.get(eventName);
        if (eventListeners) {
          eventListeners.forEach((cb) => {
            try {
              cb(data);
            } catch (listenerErr) {
              console.warn(`[Socket.IO Mobile] Error in listener for ${eventName}:`, listenerErr);
            }
          });
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, restaurant?.id]);

  const subscribe = (event: string, callback: SocketEventListener) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    return () => {
      const set = listenersRef.current.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        lastEvent,
        subscribe,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
