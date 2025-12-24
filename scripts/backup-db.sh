#!/bin/bash
# Hub - Database Backup Script
# Creates PostgreSQL backup with automatic rotation
#
# Usage:
#   bash backup-db.sh              # Backup with default settings
#   bash backup-db.sh --keep 14    # Keep last 14 backups
#   bash backup-db.sh --dir /path  # Custom backup directory
#
# Cron example (daily at 2:00 AM):
#   0 2 * * * /opt/hub/scripts/backup-db.sh >> /var/log/hub-backup.log 2>&1

set -e

# Defaults
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
KEEP_DAYS=7
CONTAINER_NAME="hub-postgres-1"
DB_NAME="hub_db"
DB_USER="hub"
DATE=$(date +%Y%m%d_%H%M%S)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep)
            KEEP_DAYS="$2"
            shift 2
            ;;
        --dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: backup-db.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --keep N        Keep last N backups (default: 7)"
            echo "  --dir PATH      Backup directory (default: ./backups)"
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

echo "=== Hub Database Backup ==="
echo "Date: $(date)"
echo "Container: $CONTAINER_NAME"
echo "Backup dir: $BACKUP_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Container $CONTAINER_NAME is not running!"
    exit 1
fi

# Create backup
BACKUP_FILE="${BACKUP_DIR}/hub_backup_${DATE}.sql.gz"
echo "Creating backup: $BACKUP_FILE"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup created successfully: $SIZE"
else
    echo "ERROR: Backup file is empty!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Rotate old backups
echo ""
echo "Rotating backups (keeping last $KEEP_DAYS)..."
DELETED=0
for old_backup in $(ls -t "${BACKUP_DIR}"/hub_backup_*.sql.gz 2>/dev/null | tail -n +$((KEEP_DAYS + 1))); do
    echo "  Deleting: $(basename "$old_backup")"
    rm -f "$old_backup"
    DELETED=$((DELETED + 1))
done
echo "Deleted $DELETED old backup(s)"

# List current backups
echo ""
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/hub_backup_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "=== Backup complete ==="
