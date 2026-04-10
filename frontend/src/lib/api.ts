import type { CreateRoomResponse, JoinTokenResponse, RoomInfo, RoomMode } from '../types';

const base = () =>
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export async function createRoom(mode?: RoomMode): Promise<CreateRoomResponse> {
  const res = await fetch(`${base()}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mode ? { mode } : {}),
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  return res.json() as Promise<CreateRoomResponse>;
}

export async function getRoom(roomId: string): Promise<RoomInfo> {
  const res = await fetch(`${base()}/api/rooms/${encodeURIComponent(roomId)}`);
  if (res.status === 404) throw new Error('ROOM_NOT_FOUND');
  if (!res.ok) throw new Error(`Room lookup failed: ${res.status}`);
  return res.json() as Promise<RoomInfo>;
}

export async function joinToken(
  roomId: string,
  displayName: string
): Promise<JoinTokenResponse> {
  const res = await fetch(`${base()}/api/rooms/${encodeURIComponent(roomId)}/join-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (res.status === 404) throw new Error('ROOM_NOT_FOUND');
  if (res.status === 403) throw new Error('ROOM_FULL');
  if (!res.ok) throw new Error(`Join failed: ${res.status}`);
  return res.json() as Promise<JoinTokenResponse>;
}
