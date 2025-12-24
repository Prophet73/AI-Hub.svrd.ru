#!/bin/bash
# Hub - Database Statistics
# Shows counts and statistics for all tables
#
# Usage:
#   bash db-stats.sh
#   bash db-stats.sh --json    # Output as JSON

set -e

CONTAINER_NAME="hub-postgres-1"
DB_NAME="hub_db"
DB_USER="hub"
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: db-stats.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --json          Output as JSON"
            echo "  --container NAME Container name (default: hub-postgres-1)"
            echo "  -h, --help      Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Container $CONTAINER_NAME is not running!" >&2
    exit 1
fi

# Collect stats
STATS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT json_build_object(
    'users', json_build_object(
        'total', (SELECT COUNT(*) FROM users),
        'active', (SELECT COUNT(*) FROM users WHERE is_active = true),
        'admins', (SELECT COUNT(*) FROM users WHERE is_admin = true),
        'logged_in_today', (SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE),
        'logged_in_week', (SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days')
    ),
    'applications', json_build_object(
        'total', (SELECT COUNT(*) FROM applications),
        'active', (SELECT COUNT(*) FROM applications WHERE is_active = true)
    ),
    'oauth_codes', json_build_object(
        'total', (SELECT COUNT(*) FROM oauth_codes),
        'expired', (SELECT COUNT(*) FROM oauth_codes WHERE expires_at < NOW()),
        'used', (SELECT COUNT(*) FROM oauth_codes WHERE used IS NOT NULL)
    ),
    'oauth_tokens', json_build_object(
        'total', (SELECT COUNT(*) FROM oauth_tokens),
        'active', (SELECT COUNT(*) FROM oauth_tokens WHERE expires_at > NOW() AND revoked_at IS NULL),
        'expired', (SELECT COUNT(*) FROM oauth_tokens WHERE expires_at < NOW()),
        'revoked', (SELECT COUNT(*) FROM oauth_tokens WHERE revoked_at IS NOT NULL)
    ),
    'database', json_build_object(
        'size', (SELECT pg_size_pretty(pg_database_size('$DB_NAME'))),
        'connections', (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '$DB_NAME')
    ),
    'generated_at', NOW()
);
")

if [ "$JSON_OUTPUT" = true ]; then
    echo "$STATS"
    exit 0
fi

# Pretty print
echo "=== Hub Database Statistics ==="
echo "Generated: $(date)"
echo ""

# Parse JSON and display (using basic string manipulation)
echo "$STATS" | python3 -c "
import sys
import json
from datetime import datetime

data = json.load(sys.stdin)

print('USERS')
print(f\"  Total:           {data['users']['total']}\")
print(f\"  Active:          {data['users']['active']}\")
print(f\"  Admins:          {data['users']['admins']}\")
print(f\"  Logged in today: {data['users']['logged_in_today']}\")
print(f\"  Logged in week:  {data['users']['logged_in_week']}\")
print()
print('APPLICATIONS')
print(f\"  Total:           {data['applications']['total']}\")
print(f\"  Active:          {data['applications']['active']}\")
print()
print('OAUTH CODES')
print(f\"  Total:           {data['oauth_codes']['total']}\")
print(f\"  Expired:         {data['oauth_codes']['expired']}\")
print(f\"  Used:            {data['oauth_codes']['used']}\")
print()
print('OAUTH TOKENS')
print(f\"  Total:           {data['oauth_tokens']['total']}\")
print(f\"  Active:          {data['oauth_tokens']['active']}\")
print(f\"  Expired:         {data['oauth_tokens']['expired']}\")
print(f\"  Revoked:         {data['oauth_tokens']['revoked']}\")
print()
print('DATABASE')
print(f\"  Size:            {data['database']['size']}\")
print(f\"  Connections:     {data['database']['connections']}\")
" 2>/dev/null || echo "$STATS"

echo ""
echo "=== End of statistics ==="
