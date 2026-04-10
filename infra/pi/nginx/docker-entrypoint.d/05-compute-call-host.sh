#!/bin/sh
set -e
# Runs before nginx envsubst (20-envsubst-on-templates.sh). Sets CALL_HOST for default.conf.template.
if [ -n "${CALL_HOST:-}" ]; then
  export CALL_HOST
elif [ -n "${APP_BASE_URL:-}" ]; then
  CALL_HOST=$(printf '%s' "$APP_BASE_URL" | sed -e 's|^[a-zA-Z][a-zA-Z0-9+.-]*://||' -e 's|/.*||')
  export CALL_HOST
else
  echo "nginx: set APP_BASE_URL or CALL_HOST in .env (see infra/pi/.env.example)" >&2
  exit 1
fi
