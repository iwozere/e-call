#!/usr/bin/env bash
set -euo pipefail

# Deploy static frontend build and restart PM2 backend on Raspberry Pi 5 (Ubuntu 24.04).
# Prerequisites: Node 20, PM2, nginx, built artifacts in ./dist on the build machine
# or build on-device. Adjust paths to match your server layout.

FRONTEND_SRC="${1:-../frontend/dist}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/e-call}"

echo "Syncing frontend to ${DEPLOY_ROOT}/frontend ..."
sudo mkdir -p "${DEPLOY_ROOT}/frontend"
sudo rsync -a --delete "${FRONTEND_SRC}/" "${DEPLOY_ROOT}/frontend/"

echo "Restarting backend (PM2 process name: ecall-api) ..."
pm2 restart ecall-api || pm2 start "$(dirname "$0")/../ecosystem.config.cjs"

echo "Done. Reload nginx if config changed: sudo nginx -t && sudo systemctl reload nginx"
