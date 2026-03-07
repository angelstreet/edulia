#!/usr/bin/env bash
# Usage: ./scripts/deploy-dev.sh [--migrate]
# Push local commits to prod VM. API auto-reloads, frontend HMR refreshes.
set -e

REMOTE="edulia-app"
REMOTE_DIR="/opt/edulia/backend"
ENV_FILE="$REMOTE_DIR/.env"
VENV="$REMOTE_DIR/.venv/bin/activate"

echo "→ Pushing to GitHub..."
git push origin main

echo "→ Pulling on $REMOTE..."
ssh $REMOTE "cd $REMOTE_DIR && git pull origin main"

if [[ "$1" == "--migrate" ]]; then
  echo "→ Running migrations..."
  ssh $REMOTE "cd $REMOTE_DIR/apps/api && set -a && source $ENV_FILE && set +a && source $VENV && alembic upgrade head"
fi

echo "✓ Done — uvicorn reloaded automatically, vite HMR active"
