#!/bin/bash
# Hub - Health Check Script
# Checks status of all Hub services
#
# Usage:
#   bash health-check.sh
#   bash health-check.sh --json    # Output as JSON
#   bash health-check.sh --quiet   # Exit code only (0=healthy, 1=unhealthy)
#
# Exit codes:
#   0 - All services healthy
#   1 - One or more services unhealthy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"
JSON_OUTPUT=false
QUIET=false
DOMAIN="${DOMAIN:-localhost}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --quiet|-q)
            QUIET=true
            shift
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: health-check.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --json          Output as JSON"
            echo "  --quiet, -q     Exit code only"
            echo "  --domain NAME   Domain to check (default: localhost)"
            echo "  -h, --help      Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

cd "$PROJECT_DIR"

HEALTHY=true
RESULTS=()

# Check function
check_service() {
    local name="$1"
    local check_cmd="$2"
    local status="unhealthy"
    local details=""

    if eval "$check_cmd" >/dev/null 2>&1; then
        status="healthy"
    else
        HEALTHY=false
        details=$(eval "$check_cmd" 2>&1 | head -1 || echo "Check failed")
    fi

    RESULTS+=("{\"name\":\"$name\",\"status\":\"$status\",\"details\":\"$details\"}")

    if [ "$QUIET" != true ] && [ "$JSON_OUTPUT" != true ]; then
        if [ "$status" = "healthy" ]; then
            echo "  [OK] $name"
        else
            echo "  [FAIL] $name: $details"
        fi
    fi
}

if [ "$QUIET" != true ] && [ "$JSON_OUTPUT" != true ]; then
    echo "=== Hub Health Check ==="
    echo "Time: $(date)"
    echo ""
    echo "Checking services..."
fi

# Check Docker
check_service "Docker" "docker info"

# Check containers
check_service "PostgreSQL container" "docker ps --format '{{.Names}}' | grep -q hub-postgres"
check_service "Backend container" "docker ps --format '{{.Names}}' | grep -q hub-backend"
check_service "Frontend container" "docker ps --format '{{.Names}}' | grep -q hub-frontend"

# Check container health
check_service "PostgreSQL healthy" "docker exec hub-postgres-1 pg_isready -U hub"

# Check backend API (internal)
check_service "Backend API" "docker exec hub-backend-1 curl -sf http://localhost:8000/health || docker exec hub-backend-1 wget -qO- http://localhost:8000/health"

# Check database connectivity
check_service "Database connection" "docker exec hub-postgres-1 psql -U hub -d hub_db -c 'SELECT 1'"

# Check external endpoints (if domain set)
if [ "$DOMAIN" != "localhost" ]; then
    check_service "HTTPS endpoint" "curl -sf --max-time 5 https://$DOMAIN/ || wget -qO- --timeout=5 https://$DOMAIN/"
    check_service "API endpoint" "curl -sf --max-time 5 https://$DOMAIN/api/applications || true"
fi

# Output results
if [ "$JSON_OUTPUT" = true ]; then
    echo "{"
    echo "  \"healthy\": $HEALTHY,"
    echo "  \"checked_at\": \"$(date -Iseconds)\","
    echo "  \"services\": ["
    for i in "${!RESULTS[@]}"; do
        if [ $i -lt $((${#RESULTS[@]} - 1)) ]; then
            echo "    ${RESULTS[$i]},"
        else
            echo "    ${RESULTS[$i]}"
        fi
    done
    echo "  ]"
    echo "}"
elif [ "$QUIET" != true ]; then
    echo ""
    if [ "$HEALTHY" = true ]; then
        echo "Status: ALL HEALTHY"
    else
        echo "Status: UNHEALTHY - Some services failed"
    fi
    echo ""
    echo "=== End of health check ==="
fi

# Exit code
if [ "$HEALTHY" = true ]; then
    exit 0
else
    exit 1
fi
