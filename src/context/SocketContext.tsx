import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastEvent: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Gentle web audio notification for kitchen/bar tickets
  const playTicketChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio might be restricted until user interacts
    }
  };

  useEffect(() => {
    // Determine WebSocket server URL (handles same-origin and separate cloud domains)
    const apiEnv = import.meta.env.VITE_API_BASE_URL;
    const wsEnv = import.meta.env.VITE_WS_URL;
    let serverUrl = wsEnv || (apiEnv && apiEnv.startsWith('http') ? apiEnv.replace(/\/api(\/v1)?\/?$/, '') : undefined);

    // Auto-detect Vercel or production hosting to connect WebSocket to Render backend
    if (!serverUrl && typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.includes('vercel.app') || host.includes('prismhut') || import.meta.env.PROD) {
        serverUrl = 'https://prismhut-org.onrender.com';
      }
    }

    const socketInstance = serverUrl
      ? io(serverUrl, {
          path: '/socket.io',
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
        })
      : io({
          path: '/socket.io',
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
        });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to POS live server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from POS live server');
      setIsConnected(false);
    });

    // Invalidate queries automatically upon events
    socketInstance.on('order.created', (data) => {
      setLastEvent('order.created');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socketInstance.on('order.updated', (data) => {
      setLastEvent('order.updated');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socketInstance.on('kot.created', (data) => {
      setLastEvent('kot.created');
      playTicketChime();
      queryClient.invalidateQueries({ queryKey: ['kot'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socketInstance.on('kot.updated', (data) => {
      setLastEvent('kot.updated');
      queryClient.invalidateQueries({ queryKey: ['kot'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socketInstance.on('bot.created', (data) => {
      setLastEvent('bot.created');
      playTicketChime();
      queryClient.invalidateQueries({ queryKey: ['bot'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socketInstance.on('bot.updated', (data) => {
      setLastEvent('bot.updated');
      queryClient.invalidateQueries({ queryKey: ['bot'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socketInstance.on('table.updated', (data) => {
      setLastEvent('table.updated');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socketInstance.on('payment.completed', (data) => {
      setLastEvent('payment.completed');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
