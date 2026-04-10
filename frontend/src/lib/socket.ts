import { io, type Socket } from 'socket.io-client';

const base = () =>
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export function createSignalingSocket(): Socket {
  return io(`${base()}/signaling`, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });
}
