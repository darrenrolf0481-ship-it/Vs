#!/usr/bin/env bash
#
# Starts the backend and the frontend together, so you don't need two
# Termux sessions. Ctrl+C stops both.
#
# Usage:
#   ./start.sh
#   WORKSPACE=~/my-project ./start.sh

set -euo pipefail

cd "$(dirname "$0")"

BACKEND_PORT="${PORT:-3001}"

if [ ! -d server/node_modules ]; then
  echo "Installing backend dependencies..."
  (cd server && npm install)
fi

if [ ! -d app/node_modules ]; then
  echo "Installing frontend dependencies..."
  (cd app && npm install)
fi

# Make sure both children die when this script exits, otherwise a stray
# backend keeps holding the port and the next run fails confusingly.
BACK_PID=""
FRONT_PID=""
cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACK_PID" ] && kill "$BACK_PID" 2>/dev/null || true
  [ -n "$FRONT_PID" ] && kill "$FRONT_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend on port ${BACKEND_PORT}..."
(cd server && npm start) &
BACK_PID=$!

# Wait for the backend to actually answer before starting the UI, so the
# editor doesn't load in "demo" mode and make you think it's broken.
# curl isn't installed by default on some systems (e.g. a bare Termux), so
# fall back to a fixed pause rather than failing outright.
if command -v curl >/dev/null 2>&1; then
  for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" >/dev/null 2>&1; then
      echo "Backend is up."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "Backend did not start in time — check the output above."
    fi
    sleep 0.5
  done
else
  echo "(curl not found — waiting a few seconds for the backend)"
  sleep 4
fi

echo "Starting frontend..."
(cd app && npm run dev) &
FRONT_PID=$!

echo ""
echo "  Open http://localhost:3000 in your browser."
echo "  Press Ctrl+C to stop both."
echo ""

wait
