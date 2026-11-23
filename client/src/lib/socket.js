'use client';

import { io } from 'socket.io-client';

let socket = null;

export const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_SOCKET_URL environment variable is missing in production! Please configure it in your Vercel deployment settings.'
    );
  }
  return 'http://localhost:5000';
};

export const getSocket = () => {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const SOCKET_URL = getSocketUrl();
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to Dispatchly real-time gateway:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  return socket;
};
