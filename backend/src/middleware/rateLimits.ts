import rateLimit from 'express-rate-limit';
import type { AuditLog } from '../audit/auditLog.js';
import type { AppEnv } from '../config/env.js';

export function createRoomCreateRateLimiter(env: AppEnv, audit: AuditLog) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitRoomCreateMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      audit.emit({
        eventType: 'security.rate_limit.triggered',
        outcome: 'denied',
        actorType: 'guest',
        requestId: req.requestId,
        sourceIpHash: req.sourceIpHash,
        userAgent: req.userAgent,
        reasonCode: 'ROOM_CREATE',
        metadata: { endpoint: 'POST /api/rooms' },
      });
      res.status(429).json({ error: 'Too many requests' });
    },
  });
}

export function createRoomJoinRateLimiter(env: AppEnv, audit: AuditLog) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitRoomJoinMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      audit.emit({
        eventType: 'security.rate_limit.triggered',
        outcome: 'denied',
        actorType: 'guest',
        requestId: req.requestId,
        sourceIpHash: req.sourceIpHash,
        userAgent: req.userAgent,
        reasonCode: 'ROOM_JOIN',
        metadata: { endpoint: 'POST /api/rooms/:roomId/join-token' },
      });
      res.status(429).json({ error: 'Too many requests' });
    },
  });
}
