import cors from 'cors';
import express from 'express';
import type { AuditLog } from './audit/auditLog.js';
import type { AppEnv } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import {
  createRoomCreateRateLimiter,
  createRoomJoinRateLimiter,
} from './middleware/rateLimits.js';
import { healthRouter } from './routes/health.js';
import { createRoomsRouter } from './routes/rooms.js';
import type { AppLogger } from './logging/logger.js';
import type { RoomService } from './services/roomService.js';

export function createApp(
  env: AppEnv,
  deps: {
    roomService: RoomService;
    logger: AppLogger;
    audit: AuditLog;
  }
): express.Express {
  const { roomService, logger, audit } = deps;
  const app = express();
  if (env.trustProxy) {
    app.set('trust proxy', true);
  }
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(requestContextMiddleware(env));

  const createRoomLimiter = createRoomCreateRateLimiter(env, audit);
  const joinTokenLimiter = createRoomJoinRateLimiter(env, audit);

  app.use(healthRouter);
  app.use(
    '/api',
    createRoomsRouter(roomService, audit, {
      createRoom: createRoomLimiter,
      joinToken: joinTokenLimiter,
    })
  );

  app.use(errorHandler(logger, env.nodeEnv));
  return app;
}
