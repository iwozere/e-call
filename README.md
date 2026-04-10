# E-Call

Browser video calls by link: React + Vite frontend, Express + Socket.io backend, optional LiveKit SFU. See `docs/project-specification.md` for the full architecture.

## Prerequisites

- Node.js 20 LTS
- npm
- Docker Desktop (optional, for LiveKit via `infra/docker-compose.yml`)

## Setup

1. Copy environment examples and adjust if needed:

   - `backend/.env` from `backend/.env.example`
   - `frontend/.env` from `frontend/.env.example`

2. Install dependencies from the repo root:

   ```bash
   npm install
   ```

## Local development

Terminal 1 — API + signaling (port 3001):

```bash
npm run dev:backend
```

Terminal 2 — frontend (port 5173):

```bash
npm run dev:frontend
```

Or run both:

```bash
npm run dev
```

Open `http://localhost:5173`. Create a room, copy the invite link, and open it in a second tab or device. For a two-party P2P test, use exactly two participants per room.

## Production build

```bash
npm run build
```

Backend output: `backend/dist`. Frontend output: `frontend/dist`.

## LiveKit (group / SFU mode)

1. Start LiveKit using host networking as in `infra/docker-compose.yml` (Linux; on Windows use WSL2 or run LiveKit on another host and point `LIVEKIT_URL` at it).
2. Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in `backend/.env` to match `infra/livekit.yaml`.
3. Create SFU rooms with `POST /api/rooms` and body `{ "mode": "sfu" }`, or set `VITE_DEFAULT_ROOM_MODE=sfu` for the home page (requires a configured server).

## Raspberry Pi 5

Use `infra/nginx.conf` as a template for TLS, `/api`, `/socket.io/`, and LiveKit proxying. Use PM2 for the Node process and sync `frontend/dist` to your web root; see `infra/deploy/pi5-deploy.sh` as a starting point.
