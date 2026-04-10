# nginx (P2P stack)

- **`templates/default.conf.template`** — processed by the official `nginx` image at startup (`envsubst` → `/etc/nginx/conf.d/default.conf`).
- **`docker-entrypoint.d/05-compute-call-host.sh`** — sets **`CALL_HOST`** from **`APP_BASE_URL`** (or uses **`CALL_HOST`** if already set in `.env`).

So you normally only set **`APP_BASE_URL`** in `infra/pi/.env`; no duplicate hostname in a static nginx file.

After cloning on Linux/Pi, ensure the hook is executable:

`chmod +x nginx/docker-entrypoint.d/05-compute-call-host.sh`
