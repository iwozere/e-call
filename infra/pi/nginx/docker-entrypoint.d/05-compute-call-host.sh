#!/bin/sh
set -e
# Runs before nginx envsubst (20-envsubst-on-templates.sh). Sets CALL_HOST for default.conf.template.
sanitize() {
  printf '%s' "$1" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

if [ -n "${CALL_HOST:-}" ]; then
  CALL_HOST=$(sanitize "$CALL_HOST")
elif [ -n "${APP_BASE_URL:-}" ]; then
  CALL_HOST=$(sanitize "$APP_BASE_URL" | sed -e 's|^[a-zA-Z][a-zA-Z0-9+.-]*://||' -e 's|/.*||')
else
  echo "nginx: set APP_BASE_URL or CALL_HOST in .env (see infra/pi/.env.example)" >&2
  exit 1
fi

if [ -z "$CALL_HOST" ]; then
  echo "nginx: CALL_HOST is empty after parsing APP_BASE_URL (check .env for CRLF or typos)" >&2
  exit 1
fi

export CALL_HOST
echo "nginx: CALL_HOST=$CALL_HOST" >&2
