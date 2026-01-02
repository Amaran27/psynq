#!/bin/sh
# PgPool-II Initialization Script
# Phase 1 Infrastructure - Connection Pooling Setup
# Psitrix Psynq CPaaS Platform

set -e

echo "========================================="
echo "PgPool-II Initialization"
echo "========================================="

# Environment Variables
POSTGRES_USER="${POSTGRES_USER:-psynq_admin}"
POSTGRES_PASSWORD_FILE="${POSTGRES_PASSWORD_FILE:-/run/secrets/postgres_password}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres_primary}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-psynq}"

POOL_PASSWD_FILE="/etc/pgpool-II/pool_passwd"

# Read password from secret
if [ -f "$POSTGRES_PASSWORD_FILE" ]; then
    POSTGRES_PASSWORD=$(cat "$POSTGRES_PASSWORD_FILE")
else
    echo "ERROR: Password file not found at $POSTGRES_PASSWORD_FILE"
    exit 1
fi

echo "Waiting for PostgreSQL primary at $POSTGRES_HOST:$POSTGRES_PORT..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo "PostgreSQL is ready!"

# Generate pool_passwd file with SCRAM-SHA-256 hash
echo "Generating pool_passwd file..."

# Create pool_passwd with SCRAM-SHA-256 hash
# Use pg_md5 command from PgPool-II to generate the hash
pg_md5 --md5auth --username="$POSTGRES_USER" "$POSTGRES_PASSWORD"

if [ $? -eq 0 ]; then
    echo "pool_passwd generated successfully!"
else
    echo "WARNING: Failed to generate pool_passwd. Using fallback method."
    # Fallback: Create pool_passwd manually
    echo "$POSTGRES_USER:SCRAM-SHA-256:\$(pg_md5 $POSTGRES_PASSWORD)" > "$POOL_PASSWD_FILE"
fi

# Verify backend connectivity
echo "Verifying backend connectivity..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Backend connectivity verified!"
else
    echo "WARNING: Could not verify backend connectivity."
fi

echo "========================================="
echo "PgPool-II initialization completed!"
echo "Starting PgPool-II..."
echo "========================================="

# Let the default entrypoint continue
exec /usr/local/bin/pgpool -n
