import { nanoid } from 'nanoid';
import type { HttpAuditFields } from '../audit/httpContext.js';
import type { AuditLog } from '../audit/auditLog.js';
import type { AppEnv } from '../config/env.js';
import { assertLivekitConfigured } from '../config/env.js';
import type { ParticipantMeta, RoomMode } from '../types/index.js';
import type { RoomRepository } from '../repositories/RoomRepository.js';
import { createLiveKitJoinToken } from './livekitTokenService.js';

const P2P_MAX = 2;

export class RoomService {
  constructor(
    private readonly repo: RoomRepository,
    private readonly env: AppEnv,
    private readonly audit: AuditLog
  ) {}

  async createRoom(mode: RoomMode, ctx: HttpAuditFields) {
    if (mode === 'sfu') {
      try {
        assertLivekitConfigured(this.env);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.audit.emit({
          eventType: 'integration.livekit.config.error',
          outcome: 'error',
          actorType: 'system',
          requestId: ctx.requestId,
          sourceIpHash: ctx.sourceIpHash,
          userAgent: ctx.userAgent,
          reasonCode: 'LIVEKIT_NOT_CONFIGURED',
          metadata: { message },
        });
        throw e;
      }
    }

    const room = await this.repo.createRoom(mode);

    this.audit.emit({
      eventType: 'room.created',
      outcome: 'success',
      actorType: 'guest',
      requestId: ctx.requestId,
      sourceIpHash: ctx.sourceIpHash,
      userAgent: ctx.userAgent,
      roomId: room.roomId,
      roomMode: room.mode,
      roomType: room.roomType,
      metadata: { ephemeral: true },
    });

    return {
      roomId: room.roomId,
      mode: room.mode,
      roomType: room.roomType,
      inviteUrl: `${this.env.appBaseUrl}/room/${room.roomId}`,
    };
  }

  async getRoomPublic(roomId: string, ctx: HttpAuditFields) {
    const room = await this.repo.getRoom(roomId);
    if (!room) {
      this.audit.emit({
        eventType: 'room.access.invalid',
        outcome: 'denied',
        actorType: 'guest',
        requestId: ctx.requestId,
        sourceIpHash: ctx.sourceIpHash,
        userAgent: ctx.userAgent,
        roomId,
        reasonCode: 'NOT_FOUND',
      });
      return null;
    }
    return {
      roomId: room.roomId,
      exists: true as const,
      mode: room.mode,
      roomType: room.roomType,
      participantCount: room.participants.size,
    };
  }

  async joinWithToken(roomId: string, displayName: string, ctx: HttpAuditFields) {
    this.audit.emit({
      eventType: 'room.join.attempt',
      outcome: 'success',
      actorType: 'guest',
      requestId: ctx.requestId,
      sourceIpHash: ctx.sourceIpHash,
      userAgent: ctx.userAgent,
      roomId,
      metadata: { hasDisplayName: displayName.trim().length > 0 },
    });

    const room = await this.repo.getRoom(roomId);
    if (!room) {
      this.audit.emit({
        eventType: 'room.join.denied',
        outcome: 'denied',
        actorType: 'guest',
        requestId: ctx.requestId,
        sourceIpHash: ctx.sourceIpHash,
        userAgent: ctx.userAgent,
        roomId,
        reasonCode: 'NOT_FOUND',
      });
      const err = new Error('NOT_FOUND') as Error & { code: string };
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (room.mode === 'p2p' && room.participants.size >= P2P_MAX) {
      this.audit.emit({
        eventType: 'room.join.denied',
        outcome: 'denied',
        actorType: 'guest',
        requestId: ctx.requestId,
        sourceIpHash: ctx.sourceIpHash,
        userAgent: ctx.userAgent,
        roomId,
        roomMode: room.mode,
        reasonCode: 'ROOM_FULL',
      });
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
      try {
        const lk = await createLiveKitJoinToken(
          this.env,
          roomId,
          participantId,
          participant.displayName
        );
        this.audit.emit({
          eventType: 'room.join.success',
          outcome: 'success',
          actorType: 'guest',
          actorId: participantId,
          requestId: ctx.requestId,
          sourceIpHash: ctx.sourceIpHash,
          userAgent: ctx.userAgent,
          roomId,
          roomMode: 'sfu',
          roomType: room.roomType,
          metadata: { livekitTokenIssued: true },
        });
        return { ...base, livekitUrl: lk.livekitUrl, token: lk.token };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.audit.emit({
          eventType: 'integration.livekit.token.failed',
          outcome: 'error',
          actorType: 'guest',
          actorId: participantId,
          requestId: ctx.requestId,
          sourceIpHash: ctx.sourceIpHash,
          userAgent: ctx.userAgent,
          roomId,
          roomMode: 'sfu',
          reasonCode: 'TOKEN_ISSUE_FAILED',
          metadata: { message },
        });
        await this.repo.removeParticipant(roomId, participantId);
        throw e;
      }
    }

    this.audit.emit({
      eventType: 'room.join.success',
      outcome: 'success',
      actorType: 'guest',
      actorId: participantId,
      requestId: ctx.requestId,
      sourceIpHash: ctx.sourceIpHash,
      userAgent: ctx.userAgent,
      roomId,
      roomMode: 'p2p',
      roomType: room.roomType,
    });

    return base;
  }
}
