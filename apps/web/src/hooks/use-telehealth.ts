'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface UseTelehealthOptions {
  sessionId: string;
  onSignal?: (data: { type: string; payload: any; fromUserId: string }) => void;
  onSessionStatusChanged?: (data: { sessionId: string; status: string }) => void;
  onParticipantJoined?: (data: { userId: string }) => void;
  onParticipantLeft?: (data: { userId: string }) => void;
}

export function useTelehealth({ sessionId, onSignal, onSessionStatusChanged, onParticipantJoined, onParticipantLeft }: UseTelehealthOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ndipaano_token') : null;
    if (!token || !sessionId) return;

    const socket = io(`${WS_URL}/telehealth`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('joinSession', { sessionId });
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('signal', (data) => onSignal?.(data));
    socket.on('sessionStatusChanged', (data) => onSessionStatusChanged?.(data));
    socket.on('participantJoined', (data) => onParticipantJoined?.(data));
    socket.on('participantLeft', (data) => onParticipantLeft?.(data));

    return () => {
      socket.emit('leaveSession', { sessionId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId]);

  const sendSignal = useCallback((type: string, payload: any, targetUserId: string) => {
    socketRef.current?.emit('signal', { type, payload, targetUserId });
  }, []);

  return { isConnected, sendSignal, socket: socketRef };
}
