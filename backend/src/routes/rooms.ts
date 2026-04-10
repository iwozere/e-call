import { Router } from 'express';
import type { RoomService } from '../services/roomService.js';

export function createRoomsRouter(roomService: RoomService): Router {
  const r = Router();

  r.post('/rooms', async (_req, res, next) => {
    try {
      const body = _req.body as { mode?: 'p2p' | 'sfu' } | undefined;
      const mode = body?.mode === 'sfu' ? 'sfu' : 'p2p';
      const created = await roomService.createRoom(mode);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  r.get('/rooms/:roomId', async (req, res, next) => {
    try {
      const info = await roomService.getRoomPublic(req.params.roomId);
      if (!info) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      res.json(info);
    } catch (e) {
      next(e);
    }
  });

  r.post('/rooms/:roomId/join-token', async (req, res, next) => {
    try {
      const displayName =
        typeof req.body?.displayName === 'string' ? req.body.displayName : '';
      if (!displayName.trim()) {
        res.status(400).json({ error: 'displayName is required' });
        return;
      }
      const payload = await roomService.joinWithToken(req.params.roomId, displayName);
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
