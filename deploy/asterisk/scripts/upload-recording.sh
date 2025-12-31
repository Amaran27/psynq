#!/bin/bash
# Upload call recording to MinIO after call completion
# This script is called by Asterisk's MixMonitor application
#
# Usage: upload-recording.sh <recording_file> <uniqueid> <src> <dst>
#
# Environment variables (set in docker-compose.yml):
# - MINIO_ENDPOINT: MinIO server endpoint (e.g., http://minio:9000)
# - MINIO_ACCESS_KEY: MinIO access key
# - MINIO_SECRET_KEY: MinIO secret key
# - MINIO_BUCKET: MinIO bucket name (default: call-recordings)

set -e

# Get parameters
RECORDING_FILE="${1}"
UNIQUEID="${2}"
SRC="${3:-unknown}"
DST="${4:-unknown}"

# MinIO configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-call-recordings}"

# Log file
LOG_FILE="/var/log/asterisk/upload-recording.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if recording file exists
if [ ! -f "$RECORDING_FILE" ]; then
    log "ERROR: Recording file not found: $RECORDING_FILE"
    exit 1
fi

log "Processing recording: $RECORDING_FILE (UniqueID: $UNIQUEID, From: $SRC, To: $DST)"

# Extract file extension
FILE_EXTENSION="${RECORDING_FILE##*.}"
FILE_NAME="${UNIQUEID}.${FILE_EXTENSION}"

# Generate date-based folder structure (YYYY/MM/DD)
DATE_PREFIX=$(date '+%Y/%m/%d')
OBJECT_NAME="$DATE_PREFIX/$FILE_NAME"

# Upload file to MinIO using curl
log "Uploading recording to MinIO: $OBJECT_NAME"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  --user "$MINIO_ACCESS_KEY:$MINIO_SECRET_KEY" \
  -H "Content-Type: audio/$FILE_EXTENSION" \
  --data-binary "@$RECORDING_FILE" \
  "$MINIO_ENDPOINT/$MINIO_BUCKET/$OBJECT_NAME" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
    log "ERROR: Failed to upload recording (HTTP $HTTP_CODE)"
    # Try to create bucket and retry
    log "Attempting to create bucket and retry..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
      --user "$MINIO_ACCESS_KEY:$MINIO_SECRET_KEY" \
      "$MINIO_ENDPOINT/$MINIO_BUCKET/" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
        log "Bucket is ready, retrying upload..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
          --user "$MINIO_ACCESS_KEY:$MINIO_SECRET_KEY" \
          -H "Content-Type: audio/$FILE_EXTENSION" \
          --data-binary "@$RECORDING_FILE" \
          "$MINIO_ENDPOINT/$MINIO_BUCKET/$OBJECT_NAME" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" != "200" ]; then
            log "ERROR: Failed to upload recording after bucket creation (HTTP $HTTP_CODE)"
            exit 1
        fi
    else
        log "ERROR: Failed to create bucket (HTTP $HTTP_CODE)"
        exit 1
    fi
fi

# Generate date-based folder structure (YYYY/MM/DD)
DATE_PREFIX=$(date '+%Y/%m/%d')
OBJECT_NAME="$DATE_PREFIX/$FILE_NAME"

# Upload file to MinIO using curl
log "Uploading recording to MinIO: $OBJECT_NAME"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  --user "$MINIO_ACCESS_KEY:$MINIO_SECRET_KEY" \
  -H "Content-Type: audio/$FILE_EXTENSION" \
  --data-binary "@$RECORDING_FILE" \
  "$MINIO_ENDPOINT/$MINIO_BUCKET/$OBJECT_NAME" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
    log "ERROR: Failed to upload recording (HTTP $HTTP_CODE)"
    exit 1
fi

# Generate public URL for the recording (if MinIO is configured for public access)
RECORDING_URL="$MINIO_ENDPOINT/$MINIO_BUCKET/$OBJECT_NAME"

log "Recording uploaded successfully: $RECORDING_URL"

# Clean up local recording file to save disk space
log "Cleaning up local file: $RECORDING_FILE"
rm -f "$RECORDING_FILE"

# Output the recording URL for Asterisk to capture in CDR
echo "$RECORDING_URL"

exit 0
