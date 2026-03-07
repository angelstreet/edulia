#!/usr/bin/env bash
# Usage: ./scripts/deploy-dev.sh [--migrate]
# Push local commits to VM. Vite dev server picks up changes via HMR.
set -e

REMOTE="edulia-app"
REMOTE_DIR="/opt/edulia/backend"
ENV_FILE="$REMOTE_DIR/.env"
VENV="$REMOTE_DIR/.venv/bin/activate"

echo "→ Pushing to GitHub..."
git push origin main

echo "→ Pulling on $REMOTE..."
ssh $REMOTE "cd $REMOTE_DIR && git pull origin main"

echo "→ Restarting dev API..."
ssh $REMOTE "pm2 restart edulia-api-dev"

if [[ "$1" == "--migrate" ]]; then
  echo "→ Running migrations..."
  ssh $REMOTE "cd $REMOTE_DIR/apps/api && set -a && source $ENV_FILE && set +a && source $VENV && alembic upgrade head"
fi

echo "✓ Done — Vite HMR active, API restarted"
