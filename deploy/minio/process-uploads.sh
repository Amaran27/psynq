#!/bin/bash
# Process recording upload queue from Asterisk container
# This script runs in the MinIO container and processes upload markers
#
# Run this via cron: * * * * * /usr/local/bin/process-uploads.sh

set -e

# Configuration
MARKER_DIR="/upload-queue"
RECORDING_DIR="/recordings"
MINIO_BUCKET="psynq-recordings"
LOG_FILE="/var/log/minio/process-uploads.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Create marker directory if it doesn't exist
mkdir -p "$MARKER_DIR"

# Process all marker files
for MARKER_FILE in "$MARKER_DIR"/*.upload; do
    # Check if any marker files exist
    if [ ! -e "$MARKER_FILE" ]; then
        continue
    fi

    log "Processing marker: $MARKER_FILE"

    # Read marker file
    source "$MARKER_FILE"

    # Check if recording file still exists
    if [ ! -f "$RECORDING_FILE" ]; then
        log "WARNING: Recording file not found: $RECORDING_FILE"
        rm -f "$MARKER_FILE"
        continue
    fi

    # Generate MinIO object name
    OBJECT_NAME="$DATE_PREFIX/$UNIQUEID.$FILE_EXTENSION"

    # Upload to MinIO
    log "Uploading $RECORDING_FILE to $MINIO_BUCKET/$OBJECT_NAME"
    if mc cp "$RECORDING_FILE" "myminio/$MINIO_BUCKET/$OBJECT_NAME"; then
        log "SUCCESS: Uploaded to $MINIO_BUCKET/$OBJECT_NAME"

        # Delete the recording file to save space
        rm -f "$RECORDING_FILE"
        log "Cleaned up local file: $RECORDING_FILE"

        # Remove marker file
        rm -f "$MARKER_FILE"
    else
        log "ERROR: Failed to upload $RECORDING_FILE"
    fi
done

exit 0
