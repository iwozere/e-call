# Raspberry Pi — P2P Docker stack

Files here deploy **1:1 P2P** (SPA + API + Socket.io) with **nginx** on the Pi. **Cloudflare Tunnel** is optional: use the Compose **`tunnel`** profile only if you run `cloudflared` from this repo; otherwise point your external tunnel at nginx on the Pi.

| File | Purpose |
|------|---------|
| `docker-compose.p2p.yml` | `backend` (Node), `nginx` (static + proxy); optional `cloudflared` (`--profile tunnel`) |
| `nginx/templates/default.conf.template` | nginx config; `server_name` from `APP_BASE_URL` via `nginx/docker-entrypoint.d/05-compute-call-host.sh` |
| `.env.example` | Copy to `.env`; URLs required; `TUNNEL_TOKEN` only if using the `tunnel` profile |
| `prepare-frontend.sh` | Builds frontend and fills `./html/` (Linux / macOS / Git Bash) |
| `prepare-frontend.ps1` | Same on Windows PowerShell |

Full steps: **[../../docs/deploy-pi-p2p.md](../../docs/deploy-pi-p2p.md)**.
