#!/bin/bash
# Psynq Backup Script for Mac/Linux
# Creates backup of database and configuration files

set -e

echo "========================================"
echo "Psynq Backup Script"
echo "========================================"
echo ""

# Get timestamp
TIMESTAMP=$(date +%Y%m%d)

# Create backup directory
BACKUP_DIR="backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "Backup directory: $BACKUP_DIR"
echo ""

# Check Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "[1/4] Backing up PostgreSQL database..."
DB_FILE="$BACKUP_DIR/psynq-db-backup-$TIMESTAMP.sql"

docker exec psynq-postgres-dev pg_dump -U psynq_user psynq_db > "$DB_FILE" 2>&1
if [ $? -ne 0 ]; then
    echo "[ERROR] Database backup failed!"
    exit 1
fi

DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
echo "  Database backup: $DB_FILE"
echo "  Size: $DB_SIZE"
echo ""

echo "[2/4] Backing up configuration files..."
if [ -f "deploy/config/.env" ]; then
    tar -czf "$BACKUP_DIR/config-backup-$TIMESTAMP.tar.gz" -C deploy config/ 2>&1
    echo "  Configuration backup: $BACKUP_DIR/config-backup-$TIMESTAMP.tar.gz"
    CONFIG_SIZE=$(du -h "$BACKUP_DIR/config-backup-$TIMESTAMP.tar.gz" | cut -f1)
    echo "  Size: $CONFIG_SIZE"
else
    echo "  [WARNING] .env file not found, skipping config backup"
fi
echo ""

echo "[3/4] Backing up Asterisk configurations..."
if [ -d "deploy/asterisk/asterisk-config" ]; then
    tar -czf "$BACKUP_DIR/asterisk-config-backup-$TIMESTAMP.tar.gz" -C deploy/asterisk asterisk-config/ 2>&1
    echo "  Asterisk config backup: $BACKUP_DIR/asterisk-config-backup-$TIMESTAMP.tar.gz"
    AST_SIZE=$(du -h "$BACKUP_DIR/asterisk-config-backup-$TIMESTAMP.tar.gz" | cut -f1)
    echo "  Size: $AST_SIZE"
else
    echo "  [WARNING] Asterisk config not found, skipping"
fi
echo ""

echo "[4/4] Creating backup manifest..."
MANIFEST="$BACKUP_DIR/backup-manifest.txt"
cat > "$MANIFEST" << EOF
Psynq Backup Manifest
Timestamp: $(date)
Files:
$(ls -1 "$BACKUP_DIR")
EOF
echo "  Manifest: $MANIFEST"
echo ""

echo "========================================"
echo "Backup Complete!"
echo "========================================"
echo ""
echo "Location: $BACKUP_DIR"
echo ""
echo "Contents:"
ls -1 "$BACKUP_DIR"
echo ""
echo "To restore, run:"
echo "  cd scripts"
echo "  ./restore.sh"
echo ""
