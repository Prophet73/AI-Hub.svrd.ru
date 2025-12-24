#!/bin/bash
# Hub - Cleanup Expired Tokens
# Removes expired OAuth codes and tokens from database
#
# Usage:
#   bash cleanup-tokens.sh              # Cleanup with confirmation
#   bash cleanup-tokens.sh --force      # Cleanup without confirmation
#   bash cleanup-tokens.sh --dry-run    # Show what would be deleted
#
# Cron example (daily at 3:00 AM):
#   0 3 * * * /opt/hub/scripts/cleanup-tokens.sh --force >> /var/log/hub-cleanup.log 2>&1

set -e

CONTAINER_NAME="hub-postgres-1"
DB_NAME="hub_db"
DB_USER="hub"
DRY_RUN=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force|-f)
            FORCE=true
            shift
            ;;
        --container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: cleanup-tokens.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run       Show what would be deleted without deleting"
            echo "  --force, -f     Skip confirmation prompt"
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

echo "=== Hub Token Cleanup ==="
echo "Date: $(date)"
echo "Container: $CONTAINER_NAME"
echo ""

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Container $CONTAINER_NAME is not running!"
    exit 1
fi

# Count expired items
echo "Checking for expired items..."

EXPIRED_CODES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM oauth_codes WHERE expires_at < NOW();
" | tr -d ' ')

EXPIRED_TOKENS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM oauth_tokens WHERE expires_at < NOW();
" | tr -d ' ')

USED_CODES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM oauth_codes WHERE used IS NOT NULL AND used < NOW() - INTERVAL '1 day';
" | tr -d ' ')

REVOKED_TOKENS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM oauth_tokens WHERE revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days';
" | tr -d ' ')

echo ""
echo "Found:"
echo "  Expired authorization codes: $EXPIRED_CODES"
echo "  Expired access tokens: $EXPIRED_TOKENS"
echo "  Used codes (older than 1 day): $USED_CODES"
echo "  Revoked tokens (older than 7 days): $REVOKED_TOKENS"
echo ""

TOTAL=$((EXPIRED_CODES + EXPIRED_TOKENS + USED_CODES + REVOKED_TOKENS))

if [ "$TOTAL" -eq 0 ]; then
    echo "Nothing to clean up!"
    exit 0
fi

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would delete $TOTAL items"
    exit 0
fi

# Confirm deletion
if [ "$FORCE" != true ]; then
    read -p "Delete $TOTAL items? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted"
        exit 0
    fi
fi

echo ""
echo "Cleaning up..."

# Delete expired codes
DELETED_CODES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    DELETE FROM oauth_codes
    WHERE expires_at < NOW()
       OR (used IS NOT NULL AND used < NOW() - INTERVAL '1 day');
    SELECT COUNT(*);
" | tail -1 | tr -d ' ')

# Delete expired/revoked tokens
DELETED_TOKENS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    DELETE FROM oauth_tokens
    WHERE expires_at < NOW()
       OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');
    SELECT COUNT(*);
" | tail -1 | tr -d ' ')

echo ""
echo "Deleted:"
echo "  Codes: $DELETED_CODES"
echo "  Tokens: $DELETED_TOKENS"

echo ""
echo "=== Cleanup complete ==="
