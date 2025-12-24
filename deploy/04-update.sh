#!/bin/bash
# Hub - Update application
# Run: bash 04-update.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Hub Update ==="

cd "$PROJECT_DIR"

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git pull
fi

# Rebuild and restart
echo ""
echo "=== Rebuilding containers ==="
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache

echo ""
echo "=== Restarting containers ==="
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo ""
echo "=== Waiting for services ==="
sleep 5

echo ""
echo "=== Container Status ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Backend Logs (last 10 lines) ==="
docker compose -f docker-compose.prod.yml logs --tail 10 backend

echo ""
echo "=== Update complete ==="
