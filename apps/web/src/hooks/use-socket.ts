'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

// Singleton map: one socket per namespace
const sockets = new Map<string, Socket>();

export function useSocket(namespace: string) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ndipaano_token') : null;
    if (!token) return;

    let socket = sockets.get(namespace);

    if (!socket || socket.disconnected) {
      socket = io(`${SOCKET_URL}/${namespace}`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      sockets.set(namespace, socket);
    }

    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket!.off('connect', onConnect);
      socket!.off('disconnect', onDisconnect);
    };
  }, [namespace]);

  const disconnect = useCallback(() => {
    const socket = sockets.get(namespace);
    if (socket) {
      socket.disconnect();
      sockets.delete(namespace);
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [namespace]);

  return { socket: socketRef.current, isConnected, disconnect };
}
