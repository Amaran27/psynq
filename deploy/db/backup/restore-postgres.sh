#!/bin/bash
# PostgreSQL Restore Script
# Phase 1 Infrastructure - Point-in-Time Recovery (PITR)
# Psitrix Psynq CPaaS Platform

set -e
set -o pipefail

# ============================================
# CONFIGURATION
# ============================================

# Container Names
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-psynq_postgres_primary}"

# Restore Configuration
BACKUP_NAME="${1:-$(ls -t /backups/base/*.tar.gz 2>/dev/null | head -n 1 | xargs -I {} basename {} .tar.gz)}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RESTORE_TIMESTAMP="${RESTORE_TIMESTAMP:-$(date +%Y%m%d_%H%M%S)}"

# PostgreSQL Configuration
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-psynq_admin}"
PGDATABASE="${PGDATABASE:-psynq}"

# MinIO Configuration (for remote backup retrieval)
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-psynq-backups}"

# PITR Options
TARGET_TIME="${TARGET_TIME:-}"  # Format: "YYYY-MM-DD HH:MM:SS"

# Logging
LOG_FILE="${BACKUP_DIR}/restore_${RESTORE_TIMESTAMP}.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# ============================================
# FUNCTIONS
# ============================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    log "ERROR: $*"
    exit 1
}

success() {
    log "SUCCESS: $*"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if backup exists
    if [ -z "$BACKUP_NAME" ]; then
        error "No backup specified and no recent backups found"
    fi
    
    local backup_file="${BACKUP_DIR}/base/${BACKUP_NAME}.tar.gz"
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    # Check if PostgreSQL container is running
    if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
        error "PostgreSQL container '$POSTGRES_CONTAINER' is not running"
    fi
    
    success "Prerequisites check passed"
}

download_from_minio() {
    log "Downloading backup from MinIO..."
    
    if ! command -v mc &> /dev/null; then
        log "WARNING: MinIO client (mc) not found. Skipping download."
        return 0
    fi
    
    # Configure MinIO alias
    mc alias set psynq-backup "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" || {
        log "WARNING: Failed to configure MinIO alias. Skipping download."
        return 0
    }
    
    local remote_path="psynq-backup/$MINIO_BUCKET/$BACKUP_NAME"
    
    # Download backup files
    mc cp "$remote_path/${BACKUP_NAME}.tar.gz" "${BACKUP_DIR}/base/"
    mc cp "$remote_path/${BACKUP_NAME}_global.sql" "${BACKUP_DIR}/metadata/"
    mc cp "$remote_path/${BACKUP_NAME}_schema.sql" "${BACKUP_DIR}/metadata/"
    
    success "Backup downloaded from MinIO"
}

stop_postgres() {
    log "Stopping PostgreSQL container..."
    
    docker stop "$POSTGRES_CONTAINER" || error "Failed to stop PostgreSQL"
    
    success "PostgreSQL stopped"
}

prepare_restore_directory() {
    log "Preparing restore directory..."
    
    local restore_dir="${BACKUP_DIR}/restore_${RESTORE_TIMESTAMP}"
    mkdir -p "$restore_dir"
    
    success "Restore directory prepared: $restore_dir"
}

restore_base_backup() {
    log "Restoring base backup..."
    
    local backup_file="${BACKUP_DIR}/base/${BACKUP_NAME}.tar.gz"
    local restore_dir="/var/lib/postgresql/data"
    
    # Extract backup to PostgreSQL data directory
    docker run --rm \
        -v "$restore_dir:$restore_dir" \
        -v "$backup_file:/backup.tar.gz:ro" \
        alpine:latest \
        sh -c "tar xzf /backup.tar.gz -C $restore_dir"
    
    success "Base backup restored"
}

restore_wal_archives() {
    log "Restoring WAL archives..."
    
    local wal_backup="${BACKUP_DIR}/wal/${BACKUP_NAME}/wal.tar.gz"
    local wal_archive_dir="/var/lib/postgresql/archive"
    
    if [ ! -f "$wal_backup" ]; then
        log "WARNING: WAL archive backup not found: $wal_backup"
        return 0
    fi
    
    # Extract WAL archives
    docker run --rm \
        -v "$wal_archive_dir:$wal_archive_dir" \
        -v "$wal_backup:/wal.tar.gz:ro" \
        alpine:latest \
        sh -c "tar xzf /wal.tar.gz -C $wal_archive_dir"
    
    success "WAL archives restored"
}

configure_pitr() {
    log "Configuring Point-in-Time Recovery..."
    
    local data_dir="/var/lib/postgresql/data"
    
    if [ -n "$TARGET_TIME" ]; then
        # Create recovery.signal for PITR
        docker exec "$POSTGRES_CONTAINER" sh -c "touch $data_dir/recovery.signal"
        
        # Configure recovery target
        cat <<EOF | docker exec -i "$POSTGRES_CONTAINER" tee "$data_dir/postgresql.auto.conf" > /dev/null
# PITR Configuration
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF
        
        log "Recovery target time: $TARGET_TIME"
    else
        # Create standby.signal for replica mode
        docker exec "$POSTGRES_CONTAINER" sh -c "touch $data_dir/standby.signal"
    fi
    
    success "PITR configuration completed"
}

start_postgres() {
    log "Starting PostgreSQL container..."
    
    docker start "$POSTGRES_CONTAINER" || error "Failed to start PostgreSQL"
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    until docker exec "$POSTGRES_CONTAINER" pg_isready -U "$PGUSER" 2>/dev/null; do
        sleep 2
    done
    
    success "PostgreSQL started and ready"
}

restore_global_objects() {
    log "Restoring global objects..."
    
    local global_backup="${BACKUP_DIR}/metadata/${BACKUP_NAME}_global.sql"
    
    if [ ! -f "$global_backup" ]; then
        log "WARNING: Global objects backup not found: $global_backup"
        return 0
    fi
    
    docker exec -i "$POSTGRES_CONTAINER" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d postgres < "$global_backup"
    
    success "Global objects restored"
}

verify_restore() {
    log "Verifying restore..."
    
    # Check if PostgreSQL is responding
    docker exec "$POSTGRES_CONTAINER" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        -c "SELECT 1;" > /dev/null || error "PostgreSQL is not responding"
    
    # Check database count
    local db_count=$(docker exec "$POSTGRES_CONTAINER" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d postgres \
        -t -c "SELECT COUNT(*) FROM pg_database WHERE datname NOT IN ('template0', 'template1');")
    
    log "Databases restored: $db_count"
    
    success "Restore verification passed"
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    log "========================================="
    log "PostgreSQL Restore Process Started"
    log "Backup: $BACKUP_NAME"
    log "Target Time: ${TARGET_TIME:-None (latest)}"
    log "========================================="
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Download from MinIO (if needed)
    download_from_minio
    
    # Step 3: Stop PostgreSQL
    stop_postgres
    
    # Step 4: Prepare restore directory
    prepare_restore_directory
    
    # Step 5: Restore base backup
    restore_base_backup
    
    # Step 6: Restore WAL archives
    restore_wal_archives
    
    # Step 7: Configure PITR
    configure_pitr
    
    # Step 8: Start PostgreSQL
    start_postgres
    
    # Step 9: Restore global objects
    restore_global_objects
    
    # Step 10: Verify restore
    verify_restore
    
    log "========================================="
    log "PostgreSQL Restore Process Completed Successfully"
    log "Backup: $BACKUP_NAME restored"
    log "========================================="
}

# Display usage if no backup name provided
if [ -z "$1" ] && [ ! -f "$(ls -t /backups/base/*.tar.gz 2>/dev/null | head -n 1)" ]; then
    echo "Usage: $0 <backup_name> [target_time]"
    echo ""
    echo "Examples:"
    echo "  $0 psynq_backup_20240101_120000"
    echo "  $0 psynq_backup_20240101_120000 '2024-01-01 12:00:00'"
    echo ""
    echo "Environment Variables:"
    echo "  TARGET_TIME - Recovery target time for PITR"
    exit 1
fi

# Execute main function
main "$@"
