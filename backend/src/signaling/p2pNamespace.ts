import type { Server } from 'socket.io';
import type { RoomRepository } from '../repositories/RoomRepository.js';
import type { Socket } from 'socket.io';

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

function roomKey(roomId: string, participantId: string) {
  return `${roomId}:${participantId}`;
}

export function attachP2PSignaling(io: Server, rooms: RoomRepository): void {
  const ns = io.of('/signaling');
  const participantSockets = new Map<string, Socket>();

  ns.on('connection', (socket) => {
    let active: { roomId: string; participantId: string } | null = null;

    const cleanup = async () => {
      if ((socket.data as { skipCleanup?: boolean }).skipCleanup) return;
      if (!active) return;
      const { roomId, participantId } = active;
      const key = roomKey(roomId, participantId);
      if (participantSockets.get(key) === socket) {
        participantSockets.delete(key);
      }
      await rooms.removeParticipant(roomId, participantId);
      socket.to(`room:${roomId}`).emit('participant-left', { participantId });
      active = null;
    };

    socket.on('join-room', async (payload: JoinPayload, ack?: (err?: string) => void) => {
      try {
        const room = await rooms.getRoom(payload.roomId);
        if (!room || room.mode !== 'p2p') {
          ack?.('Room not found');
          socket.emit('join-error', { code: 'ROOM_NOT_FOUND' });
          return;
        }
        const meta = room.participants.get(payload.participantId);
        if (!meta) {
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
        if (
          connectedInRoom.size >= 2 &&
          !connectedInRoom.has(payload.participantId)
        ) {
          socket.emit('room-full');
          ack?.('Room full');
          return;
        }

        const key = roomKey(payload.roomId, payload.participantId);
        const existing = participantSockets.get(key);
        if (existing) {
          (existing.data as { skipCleanup?: boolean }).skipCleanup = true;
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
      await cleanup();
    });

    socket.on('disconnect', () => {
      void cleanup();
    });
  });
}
