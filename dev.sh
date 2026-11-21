#!/usr/bin/env bash
# Start backend (port 8000) and frontend (port 5173) together. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
if [ ! -d backend/.venv ]; then
  PY=$(command -v python3.13 || command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3)
  "$PY" -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
[ -d frontend/node_modules ] || (cd frontend && npm install)
(cd backend && .venv/bin/uvicorn app:app --reload --port 8000) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
cd frontend && npm run dev
