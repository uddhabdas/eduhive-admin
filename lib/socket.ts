import { io } from 'socket.io-client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://eduhive-server.onrender.com';

export const socket = io(API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
});
