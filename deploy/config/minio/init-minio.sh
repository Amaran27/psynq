#!/bin/bash
# MinIO Initialization Script
# Phase 1 Infrastructure - S3-compatible Object Storage Setup
# Psitrix Psynq CPaaS Platform

set -e

echo "========================================="
echo "MinIO Initialization"
echo "========================================="

# Configuration
MINIO_HOST="${MINIO_HOST:-minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD_FILE="${MINIO_ROOT_PASSWORD_FILE:-/run/secrets/minio_root_password}"

# Read MinIO root password from secret
if [ -f "$MINIO_ROOT_PASSWORD_FILE" ]; then
    MINIO_ROOT_PASSWORD=$(cat "$MINIO_ROOT_PASSWORD_FILE")
else
    echo "ERROR: MinIO root password file not found at $MINIO_ROOT_PASSWORD_FILE"
    exit 1
fi

# Wait for MinIO to be ready
echo "Waiting for MinIO at $MINIO_HOST..."
until curl -f "http://$MINIO_HOST/minio/health/live" 2>/dev/null; do
    echo "MinIO is unavailable - sleeping"
    sleep 5
done

echo "MinIO is ready!"
echo ""

# Configure mc (MinIO Client) alias
mc alias set psynq "http://$MINIO_HOST" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to configure MinIO client alias"
    exit 1
fi

echo "MinIO client configured successfully"
echo ""

# Create buckets
BUCKETS=("psynq-recordings" "psynq-attachments" "psynq-exports")

echo "Creating buckets..."
for bucket in "${BUCKETS[@]}"; do
    if mc ls "psynq/$bucket" 2>/dev/null; then
        echo "  Bucket '$bucket' already exists"
    else
        mc mb "psynq/$bucket"
        echo "  Created bucket: $bucket"
    fi
done

echo ""

# Set bucket versioning (for compliance and recovery)
echo "Configuring bucket versioning..."
for bucket in "${BUCKETS[@]}"; do
    mc version enable "psynq/$bucket"
    echo "  Enabled versioning for: $bucket"
done

echo ""

# Apply bucket policies
echo "Applying bucket policies..."

# Recordings bucket policy (public read from backend/frontend networks)
if [ -f "/policies/recordings-policy.json" ]; then
    mc anonymous set-json /policies/recordings-policy.json "psynq/psynq-recordings"
    echo "  Applied policy to: psynq-recordings"
else
    echo "  WARNING: recordings-policy.json not found, skipping"
fi

# Attachments bucket policy (private, backend-only access)
if [ -f "/policies/attachments-policy.json" ]; then
    mc anonymous set-json /policies/attachments-policy.json "psynq/psynq-attachments"
    echo "  Applied policy to: psynq-attachments"
else
    echo "  WARNING: attachments-policy.json not found, skipping"
fi

# Exports bucket policy (time-limited download)
if [ -f "/policies/exports-policy.json" ]; then
    mc anonymous set-json /policies/exports-policy.json "psynq/psynq-exports"
    echo "  Applied policy to: psynq-exports"
else
    echo "  WARNING: exports-policy.json not found, skipping"
fi

echo ""

# Create service accounts (IAM users)
echo "Creating service accounts..."

# Backend service account
BACKEND_ACCESS_KEY="psynq-backend"
BACKEND_SECRET_KEY=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-40)

if mc admin user info psynq "$BACKEND_ACCESS_KEY" 2>/dev/null; then
    echo "  Service account '$BACKEND_ACCESS_KEY' already exists"
else
    mc admin user add psynq "$BACKEND_ACCESS_KEY" "$BACKEND_SECRET_KEY"
    echo "  Created service account: $BACKEND_ACCESS_KEY"
    echo "  Secret Key: $BACKEND_SECRET_KEY"
    echo "  IMPORTANT: Save this secret key - it won't be shown again"
    
    # Save to file for backend to use
    echo "$BACKEND_ACCESS_KEY" > /data/.backend_access_key
    echo "$BACKEND_SECRET_KEY" > /data/.backend_secret_key
fi

# Grant backend full access to all psynq buckets
mc admin policy set psynq readwrite user="$BACKEND_ACCESS_KEY"
echo "  Granted readwrite policy to: $BACKEND_ACCESS_KEY"

echo ""

# Set lifecycle policies (auto-delete old files)
echo "Configuring lifecycle policies..."

# Recordings: Keep for 90 days, then move to glacier equivalent (not implemented in MinIO CE)
# For now, just set expiration
cat > /tmp/recordings-lifecycle.json <<EOF
{
  "Rules": [
    {
      "ID": "DeleteOldRecordings",
      "Status": "Enabled",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
EOF

mc ilm import "psynq/psynq-recordings" < /tmp/recordings-lifecycle.json
echo "  Applied lifecycle policy to: psynq-recordings (90-day retention)"

# Exports: Delete after 7 days
cat > /tmp/exports-lifecycle.json <<EOF
{
  "Rules": [
    {
      "ID": "DeleteOldExports",
      "Status": "Enabled",
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
EOF

mc ilm import "psynq/psynq-exports" < /tmp/exports-lifecycle.json
echo "  Applied lifecycle policy to: psynq-exports (7-day retention)"

echo ""

# Enable bucket notifications (for event-driven workflows)
echo "Configuring bucket event notifications..."
# Note: Requires additional setup of notification targets (Redis, PostgreSQL, etc.)
# Skipping for Phase 1, will be configured in Phase 2

echo ""
echo "========================================="
echo "MinIO initialization completed!"
echo "========================================="
echo ""
echo "Bucket Summary:"
mc ls psynq

echo ""
echo "Service Accounts:"
echo "  - backend-service: $BACKEND_ACCESS_KEY"

echo ""
echo "Next Steps:"
echo "  1. Configure backend to use MinIO credentials from /data/.backend_access_key"
echo "  2. Test file upload/download from backend service"
echo "  3. Monitor bucket usage with: mc admin info psynq"
