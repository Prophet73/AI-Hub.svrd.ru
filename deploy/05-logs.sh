#!/bin/bash
# Hub - View logs
# Run: bash 05-logs.sh [service]
# Examples:
#   bash 05-logs.sh          # All logs
#   bash 05-logs.sh backend  # Backend only
#   bash 05-logs.sh frontend # Frontend only

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [ -n "$1" ]; then
    docker compose -f docker-compose.prod.yml logs -f "$1"
else
    docker compose -f docker-compose.prod.yml logs -f
fi
