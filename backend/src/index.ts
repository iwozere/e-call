import http from 'node:http';
import { Server } from 'socket.io';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { InMemoryRoomRepository } from './repositories/InMemoryRoomRepository.js';
import { RoomService } from './services/roomService.js';
import { attachP2PSignaling } from './signaling/p2pNamespace.js';

const env = loadEnv();
const repo = new InMemoryRoomRepository(env.roomTtlMinutes);
const roomService = new RoomService(repo, env);
const app = createApp(env, roomService);
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env.corsOrigin, credentials: true },
});

attachP2PSignaling(io, repo);

const CLEANUP_MS = 10 * 60 * 1000;
setInterval(() => {
  void repo.cleanupExpiredRooms();
}, CLEANUP_MS);

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
