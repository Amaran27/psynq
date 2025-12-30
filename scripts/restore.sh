#!/bin/bash
# Psynq Restore Script for Mac/Linux
# Restores database and configuration from backup

set -e

echo "========================================"
echo "Psynq Restore Script"
echo "========================================"
echo ""

# Check if backup directory provided
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh [backup_directory]"
    echo ""
    echo "Available backups:"
    ls -1 backups/ 2>/dev/null || echo "No backups found in backups/ directory"
    exit 1
fi

BACKUP_DIR="$1"

# Check backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "[ERROR] Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "========================================"
echo "WARNING: This will REPLACE current data!"
echo "========================================"
echo ""
echo "Backup to restore: $BACKUP_DIR"
echo ""
echo "This will:"
echo "  - Stop all services"
echo "  - Drop existing database"
echo "  - Restore database from backup"
echo "  - Restore configuration files"
echo ""
echo "Press Ctrl+C to cancel, or"
read -p "Press Enter to continue..."
echo ""

echo "========================================"
echo "Starting Restore"
echo "========================================"
echo ""

# Stop all services
echo "[1/6] Stopping all services..."
docker-compose -f docker-compose.dev.yml down
echo "  Services stopped"
echo ""

# Start PostgreSQL only
echo "[2/6] Starting PostgreSQL..."
docker-compose -f docker-compose.dev.yml up -d postgres
echo ""

# Wait for PostgreSQL to be ready
echo "[3/6] Waiting for PostgreSQL to be ready..."
until docker exec psynq-postgres-dev pg_isready -U psynq_user > /dev/null 2>&1; do
    sleep 2
done
echo "  PostgreSQL is ready"
echo ""

# Drop existing database
echo "[4/6] Dropping existing database..."
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "DROP DATABASE IF EXISTS psynq_db;"
echo "  Database dropped"
echo ""

# Create new database
echo "[5/6] Creating new database..."
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "CREATE DATABASE psynq_db;"
echo "  Database created"
echo ""

# Find database backup file
echo "[6/6] Restoring database from backup..."
DB_FILE=$(find "$BACKUP_DIR" -name "psynq-db-backup-*.sql" | head -n 1)

if [ -z "$DB_FILE" ]; then
    echo "[ERROR] No database backup found in $BACKUP_DIR"
    exit 1
fi

echo "  Restoring from: $DB_FILE"
docker exec -i psynq-postgres-dev psql -U psynq_user -d psynq_db < "$DB_FILE"
if [ $? -ne 0 ]; then
    echo "[ERROR] Database restore failed!"
    exit 1
fi
echo "  Database restored"
echo ""

# Restore configuration if exists
CONFIG_BACKUP=$(find "$BACKUP_DIR" -name "config-backup-*.tar.gz" | head -n 1)
if [ -n "$CONFIG_BACKUP" ]; then
    echo "Restoring configuration files..."
    rm -rf deploy/config
    tar -xzf "$CONFIG_BACKUP" -C deploy/
    echo "  Configuration restored"
fi

# Restore Asterisk config if exists
AST_BACKUP=$(find "$BACKUP_DIR" -name "asterisk-config-backup-*.tar.gz" | head -n 1)
if [ -n "$AST_BACKUP" ]; then
    echo "Restoring Asterisk configurations..."
    rm -rf deploy/asterisk/asterisk-config
    tar -xzf "$AST_BACKUP" -C deploy/asterisk/
    echo "  Asterisk configuration restored"
fi

echo ""
echo "========================================"
echo "Restore Complete!"
echo "========================================"
echo ""
echo "Starting all services..."
docker-compose -f docker-compose.dev.yml up -d
echo ""

echo "Waiting for services to be healthy..."
sleep 10

echo ""
echo "Verifying services..."
docker-compose -f docker-compose.dev.yml ps
echo ""
