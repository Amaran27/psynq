#!/bin/bash
# PostgreSQL Backup Script
# Phase 1 Infrastructure - Automated Backup with PITR Support
# Psitrix Psynq CPaaS Platform

set -e
set -o pipefail

# ============================================
# CONFIGURATION
# ============================================

# Container Names
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-psynq_postgres_primary}"

# Backup Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="psynq_backup_${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# PostgreSQL Configuration
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-psynq_admin}"
PGDATABASE="${PGDATABASE:-psynq}"

# WAL Archive Configuration
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/lib/postgresql/archive}"

# MinIO Configuration (for remote backup storage)
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-psynq-backups}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"
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
    
    # Check if Docker is running
    if ! docker ps > /dev/null 2>&1; then
        error "Docker is not running"
    fi
    
    # Check if PostgreSQL container is running
    if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
        error "PostgreSQL container '$POSTGRES_CONTAINER' is not running"
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    mkdir -p "${BACKUP_DIR}/base"
    mkdir -p "${BACKUP_DIR}/wal"
    mkdir -p "${BACKUP_DIR}/metadata"
    
    success "Prerequisites check passed"
}

perform_base_backup() {
    log "Starting base backup..."
    
    local backup_file="${BACKUP_DIR}/base/${BACKUP_NAME}.tar.gz"
    
    # Use pg_basebackup for consistent physical backup
    docker exec "$POSTGRES_CONTAINER" pg_basebackup \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -D - \
        -Ft \
        -z \
        -P \
        -X stream \
        | gzip > "$backup_file"
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        success "Base backup completed: $backup_file ($size)"
    else
        error "Base backup failed"
    fi
}

backup_wal_archives() {
    log "Backing up WAL archives..."
    
    local wal_backup_dir="${BACKUP_DIR}/wal/${BACKUP_NAME}"
    mkdir -p "$wal_backup_dir"
    
    # Copy WAL archives from PostgreSQL container
    docker exec "$POSTGRES_CONTAINER" sh -c "
        if [ -d '$WAL_ARCHIVE_DIR' ] && [ \"\$(ls -A $WAL_ARCHIVE_DIR 2>/dev/null)\" ]; then
            tar czf - -C '$WAL_ARCHIVE_DIR' .
        else
            echo 'No WAL archives found'
            exit 0
        fi
    " > "${wal_backup_dir}/wal.tar.gz"
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "${wal_backup_dir}/wal.tar.gz" | cut -f1)
        success "WAL archives backup completed: ${wal_backup_dir}/wal.tar.gz ($size)"
    else
        log "WARNING: WAL archive backup failed or no archives found"
    fi
}

backup_global_objects() {
    log "Backing up global objects (roles, tablespaces)..."
    
    local global_backup="${BACKUP_DIR}/metadata/${BACKUP_NAME}_global.sql"
    
    docker exec "$POSTGRES_CONTAINER" pg_dumpall \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        --globals-only \
        > "$global_backup"
    
    if [ $? -eq 0 ]; then
        success "Global objects backup completed: $global_backup"
    else
        error "Global objects backup failed"
    fi
}

backup_schema_only() {
    log "Backing up database schemas..."
    
    local schema_backup="${BACKUP_DIR}/metadata/${BACKUP_NAME}_schema.sql"
    
    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        --schema-only \
        > "$schema_backup"
    
    if [ $? -eq 0 ]; then
        success "Schema backup completed: $schema_backup"
    else
        log "WARNING: Schema backup failed"
    fi
}

create_backup_metadata() {
    log "Creating backup metadata..."
    
    local metadata_file="${BACKUP_DIR}/metadata/${BACKUP_NAME}_metadata.json"
    
    cat > "$metadata_file" <<EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$TIMESTAMP",
  "backup_type": "full",
  "base_backup": "base/${BACKUP_NAME}.tar.gz",
  "wal_backup": "wal/${BACKUP_NAME}/wal.tar.gz",
  "global_objects": "metadata/${BACKUP_NAME}_global.sql",
  "schema_backup": "metadata/${BACKUP_NAME}_schema.sql",
  "pg_version": "$(docker exec $POSTGRES_CONTAINER psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c 'SELECT version();' | head -n 1)",
  "wal_archive_location": "$WAL_ARCHIVE_DIR",
  "retention_days": $RETENTION_DAYS
}
EOF
    
    success "Backup metadata created: $metadata_file"
}

upload_to_minio() {
    log "Uploading backup to MinIO..."
    
    # Check if MinIO is accessible
    if ! command -v mc &> /dev/null; then
        log "WARNING: MinIO client (mc) not found. Skipping remote backup."
        return 0
    fi
    
    # Configure MinIO alias
    mc alias set psynq-backup "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" || {
        log "WARNING: Failed to configure MinIO alias. Skipping remote backup."
        return 0
    }
    
    # Create bucket if it doesn't exist
    mc mb --ignore-existing "psynq-backup/$MINIO_BUCKET"
    
    # Upload backup files
    local remote_path="psynq-backup/$MINIO_BUCKET/$BACKUP_NAME"
    
    mc cp "${BACKUP_DIR}/base/${BACKUP_NAME}.tar.gz" "$remote_path/"
    mc cp "${BACKUP_DIR}/wal/${BACKUP_NAME}/wal.tar.gz" "$remote_path/" 2>/dev/null || true
    mc cp "${BACKUP_DIR}/metadata/${BACKUP_NAME}_global.sql" "$remote_path/"
    mc cp "${BACKUP_DIR}/metadata/${BACKUP_NAME}_schema.sql" "$remote_path/"
    mc cp "${BACKUP_DIR}/metadata/${BACKUP_NAME}_metadata.json" "$remote_path/"
    
    success "Backup uploaded to MinIO: $remote_path"
}

cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Remove old base backups
    find "${BACKUP_DIR}/base" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Remove old WAL archives
    find "${BACKUP_DIR}/wal" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
    
    # Remove old metadata files
    find "${BACKUP_DIR}/metadata" -name "*.sql" -mtime +$RETENTION_DAYS -delete
    find "${BACKUP_DIR}/metadata" -name "*.json" -mtime +$RETENTION_DAYS -delete
    
    # Remove old log files
    find "${BACKUP_DIR}" -name "backup_*.log" -mtime +$RETENTION_DAYS -delete
    
    success "Old backups cleaned up"
}

verify_backup() {
    log "Verifying backup integrity..."
    
    local backup_file="${BACKUP_DIR}/base/${BACKUP_NAME}.tar.gz"
    
    # Check if backup file exists and is not empty
    if [ ! -s "$backup_file" ]; then
        error "Backup file is missing or empty: $backup_file"
    fi
    
    # Test archive integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted: $backup_file"
    fi
    
    success "Backup verification passed"
}

send_notification() {
    local status=$1
    local message=$2
    
    log "Sending notification: $status"
    
    # TODO: Integrate with notification system (email, Slack, etc.)
    # For now, just log it
    if [ "$status" = "success" ]; then
        success "$message"
    else
        error "$message"
    fi
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
    log "========================================="
    log "PostgreSQL Backup Process Started"
    log "Backup Name: $BACKUP_NAME"
    log "========================================="
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Perform base backup
    perform_base_backup
    
    # Step 3: Backup WAL archives
    backup_wal_archives
    
    # Step 4: Backup global objects
    backup_global_objects
    
    # Step 5: Backup schema
    backup_schema_only
    
    # Step 6: Create metadata
    create_backup_metadata
    
    # Step 7: Verify backup
    verify_backup
    
    # Step 8: Upload to MinIO (optional)
    upload_to_minio
    
    # Step 9: Cleanup old backups
    cleanup_old_backups
    
    log "========================================="
    log "PostgreSQL Backup Process Completed Successfully"
    log "Backup: $BACKUP_NAME"
    log "========================================="
    
    send_notification "success" "Backup completed successfully: $BACKUP_NAME"
}

# Execute main function
main "$@"
