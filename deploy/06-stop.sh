#!/bin/bash
# Hub - Stop application
# Run: bash 06-stop.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Stopping Hub ==="
docker compose -f docker-compose.prod.yml down

echo "=== Hub stopped ==="
