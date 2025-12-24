#!/bin/bash
# Hub - Database Restore Script
# Restores PostgreSQL from backup file
#
# Usage:
#   bash restore-db.sh backup_file.sql.gz
#   bash restore-db.sh --list              # List available backups
#   bash restore-db.sh --latest            # Restore latest backup
#
# WARNING: This will OVERWRITE the current database!

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
CONTAINER_NAME="hub-postgres-1"
DB_NAME="hub_db"
DB_USER="hub"

# Parse arguments
case "${1:-}" in
    --list|-l)
        echo "Available backups in $BACKUP_DIR:"
        echo ""
        if ls "${BACKUP_DIR}"/hub_backup_*.sql.gz 1>/dev/null 2>&1; then
            ls -lht "${BACKUP_DIR}"/hub_backup_*.sql.gz | awk '{print NR ". " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
        else
            echo "  No backups found"
        fi
        exit 0
        ;;
    --latest)
        BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/hub_backup_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$BACKUP_FILE" ]; then
            echo "ERROR: No backups found in $BACKUP_DIR"
            exit 1
        fi
        echo "Using latest backup: $BACKUP_FILE"
        ;;
    --help|-h)
        echo "Usage: restore-db.sh [OPTIONS] [BACKUP_FILE]"
        echo ""
        echo "Options:"
        echo "  --list, -l      List available backups"
        echo "  --latest        Restore from latest backup"
        echo "  --help, -h      Show this help"
        echo ""
        echo "Examples:"
        echo "  restore-db.sh backups/hub_backup_20240101_120000.sql.gz"
        echo "  restore-db.sh --latest"
        exit 0
        ;;
    "")
        echo "ERROR: No backup file specified"
        echo "Usage: restore-db.sh [--list|--latest|BACKUP_FILE]"
        exit 1
        ;;
    *)
        BACKUP_FILE="$1"
        ;;
esac

# Check backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=== Hub Database Restore ==="
echo "Backup file: $BACKUP_FILE"
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo ""
echo "WARNING: This will OVERWRITE the current database!"
echo ""
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted"
    exit 0
fi

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Container $CONTAINER_NAME is not running!"
    exit 1
fi

echo ""
echo "Restoring database..."

# Drop and recreate database
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore from backup
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo ""
echo "Verifying restore..."
TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables restored: $TABLES"

echo ""
echo "=== Restore complete ==="
