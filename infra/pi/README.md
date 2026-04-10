# Raspberry Pi — P2P Docker stack

Files here deploy **1:1 P2P** (SPA + API + Socket.io) behind **Cloudflare Tunnel**.

| File | Purpose |
|------|---------|
| `docker-compose.p2p.yml` | `backend` (Node), `nginx` (static + proxy), `cloudflared` |
| `nginx-call.conf` | `server_name` + `/`, `/api/`, `/socket.io/` |
| `.env.example` | Copy to `.env`; set `TUNNEL_TOKEN`, URLs, etc. |
| `prepare-frontend.sh` | Builds frontend and fills `./html/` (Linux / macOS / Git Bash) |
| `prepare-frontend.ps1` | Same on Windows PowerShell |

Full steps: **[../../docs/deploy-pi-p2p.md](../../docs/deploy-pi-p2p.md)**.
