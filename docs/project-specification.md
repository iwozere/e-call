# Video Chat Application Architecture

This document is a clear implementation specification for a programming agent. It describes the target architecture of a browser-based video calling application with two delivery stages: a 1-to-1 call and a 3+ participant conference mode.

The application must work in modern desktop and mobile browsers. Development environment is **Windows 11**. Production environment is **Raspberry Pi 5 running Ubuntu 24.04**.

The primary goal is simple room-based communication by link: one user creates a room, sends the room URL in a messenger, and another user opens the link and joins the call without registration.

---

## 1. Product goals

The application must support two phases:

### Phase 1

A direct browser-based video call between **two participants**.

### Phase 2

A group video conference for **three or more participants**.

### Main UX requirement

The system must support this flow:

1. User opens the app.
2. User creates a room.
3. App generates a room URL.
4. User sends the URL through any messenger.
5. Another participant opens the URL in a browser.
6. Both participants join the call without registration.

There must be no mandatory sign-up, account creation, or native app installation in the base version.

---

## 2. High-level architecture

The application should use **two communication modes**.

### Mode A: P2P for Phase 1

Use direct WebRTC peer-to-peer communication for 1-to-1 calls.

Required components:

- Browser WebRTC API (`RTCPeerConnection`)
- Signaling server
- STUN/TURN configuration

This mode is suitable for exactly two participants.

### Mode B: SFU for Phase 2

Use **LiveKit** as an SFU (Selective Forwarding Unit) for group calls.

Required components:

- LiveKit server
- Backend endpoint for LiveKit token generation
- Frontend LiveKit client integration

This mode is required for 3+ participants because mesh P2P does not scale well.

### Important architectural rule

The backend must **not** process media streams directly. It must only handle:

- room creation;
- room metadata;
- P2P signaling;
- token generation for SFU mode;
- health endpoints;
- temporary state storage.

Media traffic must flow:

- directly between browsers in P2P mode;
- through LiveKit in SFU mode.

---

## 3. System components

| Component | Purpose | Recommended technology |
|---|---|---|
| Frontend SPA | UI, local media access, room screen, participant rendering, share/copy room link | React 18 + TypeScript + Vite |
| Backend API | Room creation, room lookup, join logic, token generation | Node.js 20 + Express |
| Realtime signaling | Exchange SDP/ICE messages for P2P mode | Socket.io |
| SFU server | Group media forwarding | LiveKit |
| Reverse proxy | HTTPS, routing, WebSocket proxying | Nginx |
| Process management | Backend process lifecycle in production | PM2 |
| State storage | Temporary room and participant storage | In-memory repository for MVP |

---

## 4. Required repository structure

Use a monorepo with three main directories:

```text
videochat/
  frontend/
  backend/
  infra/
```

### 4.1 frontend/

Recommended files and folders:

```text
frontend/
  src/
    pages/
      Home.tsx
      Room.tsx
    components/
      VideoTile.tsx
      VideoGrid.tsx
      CallControls.tsx
      InvitePanel.tsx
      DisplayNameModal.tsx
      PermissionError.tsx
    hooks/
      useLocalMedia.ts
      useP2PCall.ts
      useLiveKitRoom.ts
    store/
      roomStore.ts
    lib/
      api.ts
      socket.ts
    types/
  package.json
  vite.config.ts
```

### 4.2 backend/

Recommended files and folders:

```text
backend/
  src/
    index.ts
    app.ts
    config/
      env.ts
    routes/
      rooms.ts
      health.ts
    services/
      roomService.ts
      livekitTokenService.ts
    repositories/
      RoomRepository.ts
      InMemoryRoomRepository.ts
    signaling/
      p2pNamespace.ts
    types/
  package.json
  tsconfig.json
```

### 4.3 infra/

Recommended files and folders:

```text
infra/
  docker-compose.yml
  livekit.yaml
  nginx.conf
  deploy/
    pi5-deploy.sh
```

---

## 5. Room model and temporary storage

There is no need for a relational database in the MVP.

The first implementation must use an **in-memory room repository**. Rooms are temporary. They do not need persistence across server restarts in the base version.

The agent must implement this interface first:

```ts
export interface RoomRepository {
  createRoom(mode: 'p2p' | 'sfu'): Promise<RoomMeta>;
  getRoom(roomId: string): Promise<RoomMeta | null>;
  addParticipant(roomId: string, participant: ParticipantMeta): Promise<void>;
  removeParticipant(roomId: string, participantId: string): Promise<void>;
  listParticipants(roomId: string): Promise<ParticipantMeta[]>;
  cleanupExpiredRooms(): Promise<number>;
}
```

Recommended room types:

```ts
export interface RoomMeta {
  roomId: string;
  createdAt: number;
  mode: 'p2p' | 'sfu';
  participants: Map<string, ParticipantMeta>;
}

export interface ParticipantMeta {
  participantId: string;
  displayName: string;
  joinedAt: number;
  socketId?: string;
}
```

### Storage rules

- Store rooms in memory using `Map<string, RoomMeta>`.
- Remove expired rooms by TTL.
- Run cleanup periodically, for example every 10 minutes.
- Remove empty rooms automatically.
- Do not store camera/audio content.
- Do not store chat history in the base version.
- Do not introduce PostgreSQL for the initial implementation.

### Future extensibility

The repository abstraction must allow replacing in-memory storage later with Redis if horizontal scaling is needed.

---

## 6. Backend API requirements

### 6.1 `POST /api/rooms`

Create a new room.

#### Request

No body is required for the base version.

#### Response example

```json
{
  "roomId": "m9k2q4t8xz",
  "mode": "p2p",
  "inviteUrl": "https://video.example.com/room/m9k2q4t8xz"
}
```

### Rules

- Generate `roomId` using a compact unique ID, for example `nanoid(10)`.
- Default mode can be `p2p` in MVP.
- The room URL must be directly shareable.

---

### 6.2 `GET /api/rooms/:roomId`

Return minimal room information.

#### Response example

```json
{
  "roomId": "m9k2q4t8xz",
  "exists": true,
  "mode": "p2p",
  "participantCount": 1
}
```

### Rules

- Return `404` if the room does not exist.
- Do not leak internal server details.

---

### 6.3 `POST /api/rooms/:roomId/join-token`

This endpoint is used when a participant joins a room.

#### Request example

```json
{
  "displayName": "Alex"
}
```

#### Response example for SFU mode

```json
{
  "roomId": "m9k2q4t8xz",
  "participantId": "u_8f3a",
  "displayName": "Alex",
  "livekitUrl": "wss://video.example.com/livekit",
  "token": "<jwt>"
}
```

### Rules

- In P2P mode, the backend may return join metadata without LiveKit token.
- In SFU mode, the backend must generate a valid LiveKit access token.
- Tokens should be short-lived, for example 2 to 4 hours.
- Permissions should include room join, publish, and subscribe.

---

### 6.4 `GET /healthz`

Return HTTP 200 and a short JSON response.

Example:

```json
{
  "status": "ok"
}
```

---

## 7. Socket.io signaling requirements for P2P mode

Use a dedicated namespace:

```text
/signaling
```

### Client-to-server events

- `join-room` → `{ roomId, participantId, displayName }`
- `offer` → `{ roomId, toParticipantId, sdp }`
- `answer` → `{ roomId, toParticipantId, sdp }`
- `ice-candidate` → `{ roomId, toParticipantId, candidate }`
- `leave-room` → `{ roomId, participantId }`

### Server-to-client events

- `room-state` → current participants
- `participant-joined` → notify existing participant
- `offer` → forwarded offer
- `answer` → forwarded answer
- `ice-candidate` → forwarded ICE candidate
- `participant-left` → participant disconnected or left
- `room-full` → reject third user in P2P room

### Signaling server rules

- The server only forwards signaling messages.
- The server must not inspect or transform media.
- The server must keep P2P rooms limited to two participants.
- On disconnect, the server must emit `participant-left`.

---

## 8. Frontend requirements

## 8.1 Home page

The home page must support:

- entering a display name;
- creating a room;
- joining an existing room by link;
- optionally entering a room ID manually.

The page must be simple and mobile-friendly.

### Required actions

- `Create room`
- `Join room`

---

## 8.2 Room page

The room page must handle full call lifecycle.

### Required initialization flow

1. Read room ID from URL.
2. Verify room exists using backend API.
3. Ask user for display name if missing.
4. Request camera and microphone access.
5. Depending on room mode:
   - connect using P2P hook; or
   - connect using LiveKit hook.
6. Render local and remote participants.
7. Provide call controls.

### Required features

- microphone mute/unmute;
- camera on/off;
- leave room;
- copy invite link;
- share invite link using browser share API when available;
- show clear error message if camera/microphone permission is denied.

---

## 8.3 Local media hook

Implement `useLocalMedia.ts`.

Responsibilities:

- call `navigator.mediaDevices.getUserMedia({ audio: true, video: true })`;
- expose local stream;
- expose loading and error states;
- stop all tracks on cleanup;
- support future device switching.

The hook must handle at least these errors:

- `NotAllowedError`
- `NotFoundError`
- `NotReadableError`

---

## 8.4 P2P call hook

Implement `useP2PCall.ts`.

Responsibilities:

- connect to Socket.io namespace `/signaling`;
- join a room with `participantId`;
- create `RTCPeerConnection`;
- add local media tracks;
- create and send offer;
- receive and process answer;
- exchange ICE candidates;
- track remote stream;
- close connection cleanly on leave.

### ICE configuration

Use at least one STUN server and configurable TURN server.

Example:

```ts
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turns:video.example.com:443?transport=tcp',
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_PASSWORD,
  },
];
```

---

## 8.5 LiveKit hook

Implement `useLiveKitRoom.ts`.

Responsibilities:

- request join token from backend;
- connect to LiveKit room;
- publish local tracks;
- subscribe to remote tracks;
- return participant state to UI;
- handle disconnect and cleanup.

---

## 8.6 Video rendering

Implement `VideoTile.tsx` and `VideoGrid.tsx`.

### Layout rules

- 1 participant → full-screen layout.
- 2 participants → two columns.
- 3–4 participants → 2x2 grid.
- 5–6 participants → 3-column grid.
- 7+ participants → responsive grid with minimum tile width.

### Video element rules

All video elements must support browser compatibility, especially Safari and iOS.

Use at least:

```html
<video autoplay playsinline muted></video>
```

Rules:

- local preview must be muted;
- `playsinline` is required;
- support camera-off state with avatar/initials fallback;
- support muted-audio indicator.

---

## 8.7 Invite panel

Implement `InvitePanel.tsx`.

### Required behavior

- show current room URL;
- copy URL using `navigator.clipboard.writeText()`;
- share URL using `navigator.share()` if available;
- show temporary success feedback after copy.

---

## 9. Browser compatibility requirements

The application must target:

- Chrome 90+
- Edge 90+
- Firefox 90+
- Safari 15+

### Important compatibility notes

- Production must use HTTPS for camera/microphone access.
- `localhost` is acceptable for local development.
- Safari/iOS requires careful handling of inline video.
- All video tags must include `playsinline`.

---

## 10. Environment configuration

### 10.1 Backend env

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173
LIVEKIT_URL=wss://video.example.com/livekit
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
ROOM_TTL_MINUTES=1440
```

### 10.2 Frontend env

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_DEFAULT_ROOM_MODE=p2p
VITE_TURN_USERNAME=test-user
VITE_TURN_PASSWORD=test-password
```

### Env validation rules

The backend must validate all required env variables at startup.
If a required variable is missing, the process must fail fast with a clear error.

---

## 11. Development environment: Windows 11

The implementation must be easy to run locally on Windows 11.

### Required tools

- Node.js 20 LTS
- npm or pnpm
- Docker Desktop
- Git
- VS Code

### Local run model

- frontend on port `5173`
- backend on port `3001`
- LiveKit in Docker

### Development expectations

- local development must work on `localhost`;
- camera and microphone must work in local development;
- room flow must be testable in two tabs and on two separate devices.

---

## 12. Production environment: Raspberry Pi 5 on Ubuntu

The production target is Raspberry Pi 5 with Ubuntu 24.04.

The implementation must account for:

- ARM-compatible runtime and containers;
- HTTPS;
- WebSocket proxying;
- UDP port availability for WebRTC;
- stable startup and restart behavior.

### Recommended production topology

- Nginx as reverse proxy
- backend as PM2-managed Node.js process
- LiveKit in Docker
- public domain with TLS certificate

### Important production rule

Do not treat plain HTTP production as valid. Browser media permissions must work in a secure context.

---

## 13. Infrastructure requirements

### 13.1 LiveKit

Provide a production-oriented LiveKit config.

Example structure:

```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  your_api_key: your_api_secret
turn:
  enabled: true
  domain: video.example.com
  tls_port: 443
```

### Rules

- configure a valid public domain;
- configure proper TCP and UDP ports;
- ensure external IP and firewall configuration are correct;
- TURN/TLS must be considered part of production readiness.

---

### 13.2 Nginx

Nginx must:

- serve frontend static files;
- proxy `/api` to backend;
- proxy `/socket.io/` with WebSocket upgrade headers;
- proxy LiveKit endpoint or subdomain;
- terminate TLS.

---

### 13.3 Docker / deployment

Production deployment must include:

- Docker Compose or equivalent deployment script;
- LiveKit container;
- optional nginx container or host nginx;
- restart policy;
- health checks where practical.

For Raspberry Pi 5, pay special attention to UDP networking. The implementation should prefer a deployment model that avoids common WebRTC networking failures.

---

## 14. Non-functional requirements

The implementation must satisfy these conditions:

- no user registration in MVP;
- no persistent database in MVP;
- room URL can be sent through any messenger;
- mobile-friendly UI;
- touch-friendly controls;
- clear error messages;
- clean disconnect behavior;
- easy future migration from in-memory storage to Redis;
- code must be written in TypeScript.

### Code organization rules

The agent must separate code by responsibility:

- transport layer;
- services;
- repository/storage;
- frontend UI;
- hooks;
- configuration.

Avoid placing all logic into a single file.

---

## 15. Implementation phases

### Phase 1: P2P MVP

The agent must implement in this order:

1. create monorepo structure;
2. implement backend API;
3. implement in-memory repository;
4. implement Socket.io signaling;
5. implement frontend home page;
6. implement local media hook;
7. implement P2P room flow;
8. implement room UI and controls;
9. test 1-to-1 call locally.

### Phase 2: SFU mode

The agent must then implement:

1. LiveKit local deployment;
2. backend token generation;
3. frontend LiveKit hook;
4. multi-participant UI behavior;
5. group room testing.

### Phase 3: Production hardening

The agent must then implement:

1. Raspberry Pi 5 deployment profile;
2. nginx configuration;
3. HTTPS setup support;
4. env validation and health checks;
5. cleanup jobs;
6. logging and restart behavior.

---

## 16. Agent task summary

The programming agent must start implementation according to this guideline.

### Deliverables

The agent must produce:

- a working monorepo project;
- a React frontend;
- a Node.js backend;
- Socket.io P2P signaling;
- in-memory room repository;
- LiveKit integration for phase 2;
- infrastructure files for Raspberry Pi 5 deployment;
- clear `.env.example` files;
- documented startup commands.

### Mandatory implementation principles

- Keep the MVP simple.
- Do not introduce unnecessary infrastructure early.
- Use in-memory storage first.
- Keep room join by link as the main UX.
- Build Phase 1 completely before adding Phase 2.
- Write code that can be extended later without major refactoring.

---

## 17. Final implementation constraints

The programming agent must follow these constraints strictly:

- use TypeScript in frontend and backend;
- use React for frontend;
- use Express + Socket.io for backend;
- use WebRTC API for P2P mode;
- use LiveKit for SFU mode;
- use in-memory room storage for MVP;
- target Windows 11 for development;
- target Raspberry Pi 5 Ubuntu for production;
- assume no user accounts;
- assume room access by shared URL.

If any requirement is unclear, the implementation should favor the simplest design that preserves the architecture described in this document.
