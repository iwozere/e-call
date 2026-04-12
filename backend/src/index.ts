import http from 'node:http';
import { Server } from 'socket.io';
import { AuditLog } from './audit/auditLog.js';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { createJsonLogger } from './logging/logger.js';
import { InMemoryRoomRepository } from './repositories/InMemoryRoomRepository.js';
import { RoomService } from './services/roomService.js';
import { attachP2PSignaling } from './signaling/p2pNamespace.js';

const env = loadEnv();
const logger = createJsonLogger({ level: env.logLevel, service: 'e-call-api' });
const audit = new AuditLog(logger);
const repo = new InMemoryRoomRepository(env.roomTtlMinutes);
const roomService = new RoomService(repo, env, audit);
const app = createApp(env, { roomService, logger, audit });
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env.corsOrigin, credentials: true },
});

attachP2PSignaling(io, repo, {
  audit,
  trustProxy: env.trustProxy,
  auditIpSalt: env.auditIpSalt,
});

const CLEANUP_MS = 10 * 60 * 1000;
setInterval(() => {
  void (async () => {
    const { expiredRoomIds } = await repo.cleanupExpiredRooms();
    for (const roomId of expiredRoomIds) {
      audit.emit({
        eventType: 'room.expired',
        outcome: 'success',
        actorType: 'system',
        roomId,
        metadata: { reason: 'ttl_empty' },
      });
    }
  })();
}, CLEANUP_MS);

const listen = () => {
  const host = env.listenHost?.trim() || undefined;
  const cb = () => {
    logger.info('server listening', {
      port: env.port,
      host: host ?? '(all interfaces)',
      nodeEnv: env.nodeEnv,
    });
  };
  if (host) {
    server.listen(env.port, host, cb);
  } else {
    server.listen(env.port, cb);
  }
};

listen();
