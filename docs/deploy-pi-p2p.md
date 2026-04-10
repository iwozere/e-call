# Deploy P2P on Raspberry Pi 5 (Ubuntu) with Docker + Cloudflare Tunnel

**Placeholders:** Examples use **`example.com`** / **`call.example.com`**. Replace with your real domain (DNS, tunnel, `.env`). Nginx **`server_name`** is derived from **`APP_BASE_URL`** automatically.

This guide deploys **only the 1:1 P2P stack**: React SPA, Express API, and Socket.io on **`https://call.<your-domain>`** (example: `call.example.com`). It uses **`infra/pi/docker-compose.p2p.yml`**.

**Not included:** LiveKit / `conf.*` — add that later using `docs/pi-setup.md`.

---

## What you get

- **Docker Compose** with `restart: unless-stopped` on **backend**, **nginx**, and **cloudflared**
- **TLS** at Cloudflare (tunnel); nginx listens on **HTTP port 80** inside the stack
- **ARM64**-compatible images (`node:20-bookworm-slim`, `nginx:alpine`, `cloudflared`)

---

## Prerequisites

- Raspberry Pi 5 with **Ubuntu 24.04** (or similar) and **Docker Engine** + **Docker Compose v2**
- A **Cloudflare**-managed DNS zone (e.g. `example.com`)
- A **Cloudflare Tunnel** with a **Public hostname** for your call app
- On a dev PC (or the Pi): **Node.js 20** + **npm** to build the frontend once (or build on the Pi)

---

## 1. Install Docker on the Pi (if needed)

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in, then verify:

```bash
docker run --rm hello-world
```

---

## 2. Clone the project on the Pi

```bash
git clone <your-repo-url> e-call
cd e-call
npm install
```

(`npm install` at the repo root installs workspaces so `prepare-frontend.sh` can run `npm run build -w frontend`.)

---

## 3. Cloudflare Tunnel

1. Cloudflare **Zero Trust** → **Networks** → **Tunnels** → create or select a tunnel.
2. Install via **Docker** and copy the **`TUNNEL_TOKEN`** (or use the guided install).
3. Under **Public hostnames**, add:
   - **Subdomain:** `call` (or your choice)
   - **Domain:** `example.com`
   - **Service type:** HTTP
   - **URL:** `http://nginx:80`  
     This hostname must resolve **inside the Docker network** where `cloudflared` runs. The Compose file puts `cloudflared` and `nginx` on the same user-defined network, so **`nginx`** is the correct hostname (not `localhost`).

Save. DNS for `call` is usually created automatically.

---

## 4. Configure `infra/pi`

```bash
cd infra/pi
cp .env.example .env
nano .env   # or vim
```

Set at least:

| Variable | Example | Notes |
|----------|---------|--------|
| `TUNNEL_TOKEN` | `(from Cloudflare)` | Required for `cloudflared` |
| `APP_BASE_URL` | `https://call.example.com` | Invite links; **no** trailing slash |
| `CORS_ORIGIN` | `https://call.example.com` | Must match the browser origin |
| `VITE_API_BASE_URL` | `https://call.example.com` | Same as `APP_BASE_URL` for same-origin API |

**Do not** set `LIVEKIT_*` for P2P-only.

Nginx reads the same `.env` and sets **`server_name`** from the host in **`APP_BASE_URL`** (optional override: **`CALL_HOST`**). No separate static hostname file.

Before the first **`docker compose up`**, make the nginx hook executable (Git may not preserve the bit):

```bash
chmod +x nginx/docker-entrypoint.d/05-compute-call-host.sh
```

---

## 5. Build the frontend into `html/`

From **`infra/pi`** (after `.env` contains `VITE_API_BASE_URL`):

```bash
chmod +x prepare-frontend.sh
./prepare-frontend.sh
```

This runs `npm run build -w frontend` from the repo root and copies `frontend/dist/*` into **`infra/pi/html/`**.

On **Windows** (build only, then copy the whole `e-call` tree or `infra/pi/html` to the Pi):

```powershell
cd infra\pi
Copy-Item .env.example .env
# edit .env — set VITE_API_BASE_URL, etc.
.\prepare-frontend.ps1
```

---

## 6. Build and start the stack

Still in **`infra/pi`**:

```bash
docker compose -f docker-compose.p2p.yml build
docker compose -f docker-compose.p2p.yml up -d
docker compose -f docker-compose.p2p.yml ps
docker compose -f docker-compose.p2p.yml logs -f
```

---

## 7. Smoke tests

**On the Pi** (optional; nginx is bound to loopback **8080**):

```bash
# Use the hostname from APP_BASE_URL (example: call.example.com)
curl -sS -H "Host: call.example.com" http://127.0.0.1:8080/healthz
```

Expect: `{"status":"ok"}` (via nginx → backend). The **`Host`** header must match **`server_name`**, i.e. the host part of **`APP_BASE_URL`**.

**In a browser:** open `https://call.example.com` (your real hostname). Create a room, open the invite link in a second tab or phone. For P2P, only **two** participants per room.

---

## 8. WebRTC / TUN

Signaling uses **HTTPS/WSS** through Cloudflare; **media is peer-to-peer** and often needs **TURN** on restrictive networks. For production P2P, configure a TURN server and set on the frontend build:

- `VITE_TURN_URL`
- `VITE_TURN_USERNAME`
- `VITE_TURN_PASSWORD`

Then rebuild with `./prepare-frontend.sh` and restart nginx (or recreate the stack).

---

## 9. Updates

```bash
cd /path/to/e-call
git pull
npm install
cd infra/pi
chmod +x nginx/docker-entrypoint.d/05-compute-call-host.sh
./prepare-frontend.sh
docker compose -f docker-compose.p2p.yml build
docker compose -f docker-compose.p2p.yml up -d
```

---

## 10. Troubleshooting

| Symptom | Check |
|---------|--------|
| `502` on `/api` | `docker compose logs backend`; `curl` backend health from nginx container |
| Socket never connects | Tunnel URL must reach **nginx**; nginx must proxy `/socket.io/`; `CORS_ORIGIN` must match the page origin |
| Wrong invite links | `APP_BASE_URL` in `.env` must match public `https://call...` |
| SPA blank / 404 on refresh | `html/` missing or outdated; rerun `prepare-frontend.sh`; nginx `try_files` → `/index.html` |
| nginx exits immediately / `Permission denied` on entrypoint | `chmod +x nginx/docker-entrypoint.d/05-compute-call-host.sh` |

---

## File reference

| Path | Role |
|------|------|
| `backend/Dockerfile` | Multi-stage image; build context = **repo root** |
| `infra/pi/docker-compose.p2p.yml` | Stack definition |
| `infra/pi/nginx/templates/default.conf.template` | Virtual host; `server_name` from `APP_BASE_URL` |
| `infra/pi/nginx/docker-entrypoint.d/05-compute-call-host.sh` | Sets `CALL_HOST` before `envsubst` |
| `infra/pi/.env` | Secrets + URLs (not committed) |
| `infra/pi/html/` | Built SPA (gitignored except `.gitkeep`) |

For architecture and **`conf.*` / LiveKit**, see **`pi-setup.md`**.
