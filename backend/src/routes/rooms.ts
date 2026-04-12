import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuditLog } from '../audit/auditLog.js';
import { httpAuditFromRequest } from '../audit/httpContext.js';
import type { RoomService } from '../services/roomService.js';
import { isValidRoomId } from '../util/roomId.js';

export function createRoomsRouter(
  roomService: RoomService,
  audit: AuditLog,
  rateLimits: { createRoom: RequestHandler; joinToken: RequestHandler }
): Router {
  const r = Router();

  r.post('/rooms', rateLimits.createRoom, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { mode?: 'p2p' | 'sfu' } | undefined;
      const mode = body?.mode === 'sfu' ? 'sfu' : 'p2p';
      const created = await roomService.createRoom(mode, httpAuditFromRequest(req));
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  r.get('/rooms/:roomId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      if (!isValidRoomId(roomId)) {
        audit.emit({
          eventType: 'room.access.invalid',
          outcome: 'denied',
          actorType: 'guest',
          requestId: req.requestId,
          sourceIpHash: req.sourceIpHash,
          userAgent: req.userAgent,
          reasonCode: 'INVALID_ROOM_ID',
        });
        res.status(400).json({ error: 'Invalid room' });
        return;
      }
      const info = await roomService.getRoomPublic(roomId, httpAuditFromRequest(req));
      if (!info) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      res.json(info);
    } catch (e) {
      next(e);
    }
  });

  r.post('/rooms/:roomId/join-token', rateLimits.joinToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      if (!isValidRoomId(roomId)) {
        audit.emit({
          eventType: 'room.access.invalid',
          outcome: 'denied',
          actorType: 'guest',
          requestId: req.requestId,
          sourceIpHash: req.sourceIpHash,
          userAgent: req.userAgent,
          roomId,
          reasonCode: 'INVALID_ROOM_ID',
        });
        res.status(400).json({ error: 'Invalid room' });
        return;
      }
      const displayName =
        typeof req.body?.displayName === 'string' ? req.body.displayName : '';
      if (!displayName.trim()) {
        audit.emit({
          eventType: 'room.join.failure',
          outcome: 'failure',
          actorType: 'guest',
          requestId: req.requestId,
          sourceIpHash: req.sourceIpHash,
          userAgent: req.userAgent,
          roomId,
          reasonCode: 'DISPLAY_NAME_REQUIRED',
        });
        res.status(400).json({ error: 'displayName is required' });
        return;
      }
      const payload = await roomService.joinWithToken(
        roomId,
        displayName,
        httpAuditFromRequest(req)
      );
      res.json(payload);
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      if (err.code === 'ROOM_FULL') {
        res.status(403).json({ error: 'Room is full' });
        return;
      }
      next(e);
    }
  });

  return r;
}
