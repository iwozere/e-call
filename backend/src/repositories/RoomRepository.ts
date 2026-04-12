import type { ParticipantMeta, RoomMeta, RoomMode } from '../types/index.js';

export interface RoomRepository {
  createRoom(mode: RoomMode): Promise<RoomMeta>;
  getRoom(roomId: string): Promise<RoomMeta | null>;
  addParticipant(roomId: string, participant: ParticipantMeta): Promise<void>;
  removeParticipant(roomId: string, participantId: string): Promise<void>;
  listParticipants(roomId: string): Promise<ParticipantMeta[]>;
  cleanupExpiredRooms(): Promise<{ removed: number; expiredRoomIds: string[] }>;
}
