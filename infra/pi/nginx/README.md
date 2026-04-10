# nginx (P2P stack)

- **`Dockerfile`** — extends `nginx:alpine` and bakes in **`05-compute-call-host.sh`** with **`chmod +x`** so the Pi never gets a restart loop from a non-executable bind-mounted script.
- **`templates/default.conf.template`** — mounted at runtime; `envsubst` fills **`${CALL_HOST}`**.
- **`05-compute-call-host.sh`** — sets **`CALL_HOST`** from **`APP_BASE_URL`** (or uses **`CALL_HOST`** from `.env`).

Set **`APP_BASE_URL`** in `infra/pi/.env` (and optionally **`CALL_HOST`** if the hostname must differ from that URL’s host).

Compose sets **`container_name: ecall-nginx`** so Caddy can **`reverse_proxy ecall-nginx:80`** on a shared Docker network.
