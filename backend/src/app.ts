import cors from 'cors';
import express from 'express';
import type { AppEnv } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { createRoomsRouter } from './routes/rooms.js';
import type { RoomService } from './services/roomService.js';

export function createApp(env: AppEnv, roomService: RoomService): express.Express {
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
  app.use(express.json());
  app.use(healthRouter);
  app.use('/api', createRoomsRouter(roomService));
  return app;
}
