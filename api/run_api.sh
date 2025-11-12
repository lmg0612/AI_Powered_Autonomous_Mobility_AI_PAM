#!/usr/bin/env bash
set -euo pipefail

# Move to script directory (api/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables if .env exists
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

HOST="${API_HOST:-0.0.0.0}"
PORT="${API_PORT:-8000}"

# Check for existing process using the port and kill it
EXISTING_PID=$(lsof -ti tcp:"${PORT}" || true)
if [[ -n "$EXISTING_PID" ]]; then
  echo "Port ${PORT} is already in use by process ${EXISTING_PID}. Killing it..."
  kill -9 $EXISTING_PID 2>/dev/null || true
  sleep 1
fi

echo "Starting FastAPI server on ${HOST}:${PORT} (Ctrl+C to stop)..."
exec uvicorn main:app --host "${HOST}" --port "${PORT}" --reload
