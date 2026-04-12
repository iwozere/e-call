import type { Server } from 'socket.io';
import type { AuditLog } from '../audit/auditLog.js';
import type { RoomRepository } from '../repositories/RoomRepository.js';
import type { Socket } from 'socket.io';
import { clientIpFromHandshake, hashClientIp } from '../util/ipHash.js';

type JoinPayload = {
  roomId: string;
  participantId: string;
  displayName: string;
};

type TargetPayload = {
  roomId: string;
  toParticipantId: string;
  sdp?: unknown;
  candidate?: unknown;
};

type SocketData = {
  skipCleanup?: boolean;
  leaveReason?: 'voluntary' | 'disconnect';
};

function roomKey(roomId: string, participantId: string) {
  return `${roomId}:${participantId}`;
}

export type P2PSignalingOptions = {
  audit: AuditLog;
  trustProxy: boolean;
  auditIpSalt?: string;
};

export function attachP2PSignaling(
  io: Server,
  rooms: RoomRepository,
  options: P2PSignalingOptions
): void {
  const { audit, trustProxy, auditIpSalt } = options;
  const ns = io.of('/signaling');
  const participantSockets = new Map<string, Socket>();

  ns.on('connection', (socket) => {
    const ip = clientIpFromHandshake(socket.handshake, trustProxy);
    const sourceIpHash = hashClientIp(ip, auditIpSalt);
    const ua = socket.handshake.headers['user-agent'];
    const userAgent = typeof ua === 'string' ? ua : undefined;
    const sessionId = socket.id;

    let active: { roomId: string; participantId: string } | null = null;

    const cleanup = async () => {
      if ((socket.data as SocketData).skipCleanup) return;
      if (!active) return;
      const { roomId, participantId } = active;
      const key = roomKey(roomId, participantId);
      if (participantSockets.get(key) === socket) {
        participantSockets.delete(key);
      }
      const leaveReason = (socket.data as SocketData).leaveReason ?? 'disconnect';
      await rooms.removeParticipant(roomId, participantId);
      audit.emit({
        eventType: 'room.participant.left',
        outcome: 'success',
        actorType: 'guest',
        actorId: participantId,
        roomId,
        sessionId,
        sourceIpHash,
        userAgent,
        metadata: { transport: 'signaling', leaveReason },
      });
      socket.to(`room:${roomId}`).emit('participant-left', { participantId });
      active = null;
    };

    socket.on('join-room', async (payload: JoinPayload, ack?: (err?: string) => void) => {
      try {
        const room = await rooms.getRoom(payload.roomId);
        if (!room || room.mode !== 'p2p') {
          audit.emit({
            eventType: 'room.join.denied',
            outcome: 'denied',
            actorType: 'guest',
            sessionId,
            sourceIpHash,
            userAgent,
            roomId: payload.roomId,
            roomMode: room?.mode,
            reasonCode: 'ROOM_NOT_FOUND_OR_NOT_P2P',
            metadata: { transport: 'signaling' },
          });
          ack?.('Room not found');
          socket.emit('join-error', { code: 'ROOM_NOT_FOUND' });
          return;
        }
        const meta = room.participants.get(payload.participantId);
        if (!meta) {
          audit.emit({
            eventType: 'room.join.denied',
            outcome: 'denied',
            actorType: 'guest',
            sessionId,
            sourceIpHash,
            userAgent,
            roomId: payload.roomId,
            actorId: payload.participantId,
            reasonCode: 'INVALID_PARTICIPANT',
            metadata: { transport: 'signaling' },
          });
          ack?.('Invalid participant');
          socket.emit('join-error', { code: 'INVALID_PARTICIPANT' });
          return;
        }

        const connectedInRoom = new Set<string>();
        for (const p of room.participants.keys()) {
          if (participantSockets.has(roomKey(payload.roomId, p))) {
            connectedInRoom.add(p);
          }
        }
        if (connectedInRoom.size >= 2 && !connectedInRoom.has(payload.participantId)) {
          audit.emit({
            eventType: 'room.join.denied',
            outcome: 'denied',
            actorType: 'guest',
            actorId: payload.participantId,
            sessionId,
            sourceIpHash,
            userAgent,
            roomId: payload.roomId,
            roomMode: 'p2p',
            reasonCode: 'ROOM_FULL',
            metadata: { transport: 'signaling' },
          });
          socket.emit('room-full');
          ack?.('Room full');
          return;
        }

        const key = roomKey(payload.roomId, payload.participantId);
        const existing = participantSockets.get(key);
        if (existing) {
          (existing.data as SocketData).skipCleanup = true;
          existing.disconnect(true);
        }
        participantSockets.set(key, socket);
        active = { roomId: payload.roomId, participantId: payload.participantId };
        await socket.join(`room:${payload.roomId}`);

        const list = await rooms.listParticipants(payload.roomId);
        socket.emit('room-state', list);

        socket.to(`room:${payload.roomId}`).emit('participant-joined', {
          participantId: payload.participantId,
          displayName: meta.displayName,
        });
        ack?.();
      } catch {
        audit.emit({
          eventType: 'signaling.join.error',
          outcome: 'error',
          actorType: 'guest',
          sessionId,
          sourceIpHash,
          userAgent,
          reasonCode: 'UNEXPECTED',
          metadata: { transport: 'signaling' },
        });
        ack?.('join failed');
      }
    });

    socket.on('offer', (msg: TargetPayload) => {
      if (!msg?.roomId || !msg?.toParticipantId || !msg?.sdp) return;
      const target = participantSockets.get(roomKey(msg.roomId, msg.toParticipantId));
      target?.emit('offer', {
        roomId: msg.roomId,
        fromParticipantId: active?.participantId,
        sdp: msg.sdp,
      });
    });

    socket.on('answer', (msg: TargetPayload) => {
      if (!msg?.roomId || !msg?.toParticipantId || !msg?.sdp) return;
      const target = participantSockets.get(roomKey(msg.roomId, msg.toParticipantId));
      target?.emit('answer', {
        roomId: msg.roomId,
        fromParticipantId: active?.participantId,
        sdp: msg.sdp,
      });
    });

    socket.on('ice-candidate', (msg: TargetPayload) => {
      if (!msg?.roomId || !msg?.toParticipantId || !msg?.candidate) return;
      const target = participantSockets.get(roomKey(msg.roomId, msg.toParticipantId));
      target?.emit('ice-candidate', {
        roomId: msg.roomId,
        fromParticipantId: active?.participantId,
        candidate: msg.candidate,
      });
    });

    socket.on('leave-room', async () => {
      (socket.data as SocketData).leaveReason = 'voluntary';
      await cleanup();
    });

    socket.on('disconnect', () => {
      void cleanup();
    });
  });
}
