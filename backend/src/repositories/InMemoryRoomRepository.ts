import { nanoid } from 'nanoid';
import type { ParticipantMeta, RoomMeta, RoomMode } from '../types/index.js';
import type { RoomRepository } from './RoomRepository.js';

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, RoomMeta>();
  private readonly ttlMs: number;

  constructor(ttlMinutes: number) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  async createRoom(mode: RoomMode): Promise<RoomMeta> {
    const roomId = nanoid(10);
    const room: RoomMeta = {
      roomId,
      createdAt: Date.now(),
      mode,
      participants: new Map(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  async getRoom(roomId: string): Promise<RoomMeta | null> {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (this.isExpired(room) && room.participants.size === 0) {
      this.rooms.delete(roomId);
      return null;
    }
    return room;
  }

  async addParticipant(roomId: string, participant: ParticipantMeta): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    room.participants.set(participant.participantId, participant);
  }

  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants.delete(participantId);
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  async listParticipants(roomId: string): Promise<ParticipantMeta[]> {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return [...room.participants.values()];
  }

  async cleanupExpiredRooms(): Promise<number> {
    let removed = 0;
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      const empty = room.participants.size === 0;
      const expired = now - room.createdAt > this.ttlMs;
      if (empty && expired) {
        this.rooms.delete(id);
        removed++;
      }
    }
    return removed;
  }

  private isExpired(room: RoomMeta): boolean {
    return Date.now() - room.createdAt > this.ttlMs;
  }
}
