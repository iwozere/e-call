#!/usr/bin/env bash
set -euo pipefail
# Build the SPA with production API URL and copy into ./html for nginx.
# Run from infra/pi after editing .env (needs VITE_API_BASE_URL).

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"

if [[ -f "$DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$DIR/.env"
  set +a
fi

if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
  echo "Error: set VITE_API_BASE_URL in $DIR/.env (same origin as APP_BASE_URL), e.g. https://call.example.com" >&2
  exit 1
fi

echo "Building frontend with VITE_API_BASE_URL=$VITE_API_BASE_URL ..."
(cd "$ROOT" && npm run build -w frontend)

mkdir -p "$DIR/html"
find "$DIR/html" -mindepth 1 ! -name '.gitkeep' -delete
cp -r "$ROOT/frontend/dist/"* "$DIR/html/"
echo "Copied to $DIR/html (mount this directory in docker-compose)."
