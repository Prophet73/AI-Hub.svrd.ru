#!/bin/bash
# Hub - Deploy application
# Run: bash 03-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Hub Deployment ==="

cd "$PROJECT_DIR"

# Check .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "ERROR: .env.prod not found!"
    echo "Run: bash deploy/02-setup-env.sh"
    exit 1
fi

# Load environment
export $(grep -v '^#' .env.prod | xargs)

echo "Deploying to: $DOMAIN"

# Build and start containers
echo ""
echo "=== Building containers ==="
docker compose -f docker-compose.prod.yml build

echo ""
echo "=== Starting containers ==="
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo ""
echo "=== Waiting for services ==="
sleep 10

# Check status
echo ""
echo "=== Container Status ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Hub is available at: https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Ensure DNS points $DOMAIN to this server"
echo "2. Wait for SSL certificate (may take 1-2 minutes)"
echo "3. Open https://$DOMAIN in browser"
echo ""
echo "View logs: docker compose -f docker-compose.prod.yml logs -f"
