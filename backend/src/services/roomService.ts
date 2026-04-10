import { nanoid } from 'nanoid';
import type { AppEnv } from '../config/env.js';
import { assertLivekitConfigured } from '../config/env.js';
import type { ParticipantMeta, RoomMode } from '../types/index.js';
import type { RoomRepository } from '../repositories/RoomRepository.js';
import { createLiveKitJoinToken } from './livekitTokenService.js';

const P2P_MAX = 2;

export class RoomService {
  constructor(
    private readonly repo: RoomRepository,
    private readonly env: AppEnv
  ) {}

  async createRoom(mode: RoomMode = 'p2p') {
    if (mode === 'sfu') {
      assertLivekitConfigured(this.env);
    }
    const room = await this.repo.createRoom(mode);
    return {
      roomId: room.roomId,
      mode: room.mode,
      inviteUrl: `${this.env.appBaseUrl}/room/${room.roomId}`,
    };
  }

  async getRoomPublic(roomId: string) {
    const room = await this.repo.getRoom(roomId);
    if (!room) return null;
    return {
      roomId: room.roomId,
      exists: true as const,
      mode: room.mode,
      participantCount: room.participants.size,
    };
  }

  async joinWithToken(roomId: string, displayName: string) {
    const room = await this.repo.getRoom(roomId);
    if (!room) {
      const err = new Error('NOT_FOUND') as Error & { code: string };
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (room.mode === 'p2p' && room.participants.size >= P2P_MAX) {
      const err = new Error('ROOM_FULL') as Error & { code: string };
      err.code = 'ROOM_FULL';
      throw err;
    }

    const participantId = `u_${nanoid(6)}`;
    const participant: ParticipantMeta = {
      participantId,
      displayName: displayName.trim() || 'Guest',
      joinedAt: Date.now(),
    };
    await this.repo.addParticipant(roomId, participant);

    const base = {
      roomId,
      participantId,
      displayName: participant.displayName,
    };

    if (room.mode === 'sfu') {
      const lk = await createLiveKitJoinToken(
        this.env,
        roomId,
        participantId,
        participant.displayName
      );
      return { ...base, livekitUrl: lk.livekitUrl, token: lk.token };
    }

    return base;
  }
}
