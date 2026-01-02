#!/bin/bash
# PostgreSQL Backup Verification Script
# Phase 1 Infrastructure - Backup Integrity Verification
# Psitrix Psynq CPaaS Platform

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}/base"/*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found in ${BACKUP_DIR}/base/"
    exit 1
fi

echo "========================================="
echo "Backup Verification"
echo "========================================="
echo "Backup: $LATEST_BACKUP"
echo "Timestamp: $(date)"
echo ""

# Test archive integrity
echo "Testing archive integrity..."
if gzip -t "$LATEST_BACKUP"; then
    echo "✓ Archive integrity check passed"
else
    echo "✗ Archive integrity check failed"
    exit 1
fi

# Check backup age
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 86400 ))
echo "Backup age: $BACKUP_AGE days"

if [ $BACKUP_AGE -gt 2 ]; then
    echo "⚠ WARNING: Backup is older than 2 days"
fi

# Check backup size
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

# Check if metadata exists
BACKUP_NAME=$(basename "$LATEST_BACKUP" .tar.gz)
METADATA_FILE="${BACKUP_DIR}/metadata/${BACKUP_NAME}_metadata.json"

if [ -f "$METADATA_FILE" ]; then
    echo "✓ Metadata file exists"
else
    echo "⚠ WARNING: Metadata file missing"
fi

echo ""
echo "========================================="
echo "Verification Complete"
echo "========================================="
