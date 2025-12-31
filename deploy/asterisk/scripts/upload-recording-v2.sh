#!/bin/bash
# Upload call recording to MinIO after call completion
# This script is called by Asterisk's MixMonitor application via the h extension
#
# Usage: upload-recording-v2.sh <recording_file> <uniqueid> <src> <dst>
#
# This script uses a marker file approach: it creates a marker file with upload
# instructions, and the MinIO container picks it up via a cron job or inotify

set -e

# Get parameters
RECORDING_FILE="${1}"
UNIQUEID="${2}"
SRC="${3:-unknown}"
DST="${4:-unknown}"

# Configuration
RECORDING_DIR="/var/spool/asterisk/monitor"
MARKER_DIR="/var/spool/asterisk/upload-queue"
MINIO_BUCKET="psynq-recordings"
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

# Create marker directory if it doesn't exist
mkdir -p "$MARKER_DIR"

# Generate date-based folder structure (YYYY/MM/DD)
DATE_PREFIX=$(date '+%Y/%m/%d')

# Extract file extension
FILE_EXTENSION="${RECORDING_FILE##*.}"

# Create marker file with upload instructions
MARKER_FILE="$MARKER_DIR/${UNIQUEID}.upload"
cat > "$MARKER_FILE" <<EOF
RECORDING_FILE=$RECORDING_FILE
UNIQUEID=$UNIQUEID
SRC=$SRC
DST=$DST
DATE_PREFIX=$DATE_PREFIX
FILE_EXTENSION=$FILE_EXTENSION
BUCKET=$MINIO_BUCKET
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
EOF

log "Upload request queued: $MARKER_FILE"

# Output the recording URL for database update
echo "http://127.0.0.1:9000/$MINIO_BUCKET/$DATE_PREFIX/$UNIQUEID.$FILE_EXTENSION"

exit 0
