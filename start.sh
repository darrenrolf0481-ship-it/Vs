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
# Probe with node rather than curl: curl isn't installed everywhere, and the
# old fallback (a blind sleep) reported success without checking anything.
# node is by definition present — it's what runs the server.
backend_is_up() {
  node -e '
    const port = process.argv[1];
    const req = require("http").get(
      { host: "127.0.0.1", port, path: "/api/health", timeout: 1500 },
      (res) => process.exit(res.statusCode === 200 ? 0 : 1)
    );
    req.on("error", () => process.exit(1));
    req.on("timeout", () => { req.destroy(); process.exit(1); });
  ' "$BACKEND_PORT" >/dev/null 2>&1
}

backend_ready=""
for _ in $(seq 1 30); do
  if backend_is_up; then
    backend_ready="yes"
    echo "Backend is up."
    break
  fi
  sleep 0.5
done

# Stop here rather than starting the UI anyway. Launching the frontend on a
# dead backend drops you into "demo" mode, where files aren't saved to disk
# and the terminal just says "disconnected" — and its startup banner scrolls
# the backend's actual error off the screen, which is the single most
# confusing way this can fail.
if [ -z "$backend_ready" ]; then
  echo ""
  echo "  The backend did not come up on port ${BACKEND_PORT}."
  echo "  Its error is printed above — that message is the real problem."
  echo ""
  echo "  Not starting the frontend, because without a backend the editor"
  echo "  runs in demo mode: nothing is saved to disk and the terminal will"
  echo "  not connect."
  echo ""
  echo "  To see the failure on its own:  cd server && npm start"
  echo ""
  exit 1
fi

echo "Starting frontend..."
(cd app && npm run dev) &
FRONT_PID=$!

echo ""
echo "  Open http://localhost:3000 in your browser."
echo "  Press Ctrl+C to stop both."
echo ""

wait
