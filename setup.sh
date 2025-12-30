#!/bin/bash
# Psynq One-Command Setup Script for Linux/Mac
# This script automates the complete setup process

set -e

echo ""
echo "============================================================"
echo "  Psynq Telephony Platform - Automatic Setup"
echo "============================================================"
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "💡 Please start Docker and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p deploy/config
mkdir -p deploy/asterisk/asterisk-config/keys
mkdir -p deploy/db
echo "✅ Directories created"
echo ""

# Generate .env file if it doesn't exist
if [ ! -f "deploy/config/.env" ]; then
    echo "📝 Generating .env file..."
    cp deploy/config/.env.template deploy/config/.env

    # Generate secure random passwords
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)

    # Append secrets to .env
    echo "JWT_SECRET=$JWT_SECRET" >> deploy/config/.env
    echo "SESSION_SECRET=$SESSION_SECRET" >> deploy/config/.env

    echo "✅ .env file generated with secure passwords"
else
    echo "✅ .env file already exists, skipping..."
fi
echo ""

# Build and start services
echo "🚀 Starting Docker containers..."
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d
echo "✅ Containers started"
echo ""

# Wait for database to be healthy
echo "⏳ Waiting for database to be healthy..."
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker ps --filter "name=psynq-postgres" --format "{{.Status}}" | grep -q "healthy"; then
        echo "✅ Database is healthy"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    sleep 2
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    echo "❌ Error: Database did not become healthy"
    exit 1
fi
echo ""

# Initialize database
echo "📊 Initializing database schema..."
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql || \
    echo "⚠️  Warning: PJSIP schema creation had issues (may already exist)"

docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/03-seed-data.sql || \
    echo "⚠️  Warning: Seed data insertion had issues (may already exist)"

echo "✅ Database initialized"
echo ""

# Wait for all services to be ready
echo "⏳ Waiting for all services to be ready..."
sleep 10

# Verify services
echo "🔍 Verifying services..."
docker-compose -f docker-compose.dev.yml ps
echo ""

echo ""
echo "============================================================"
echo "  🎉 SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "  🌐 Web Interface: http://localhost:3000"
echo "  🔐 Login: sysadmin@psynq.local / PsynqSecure2025!!"
echo ""
echo "  📊 Backend API: http://localhost:3001"
echo "  📞 Asterisk ARI: http://localhost:8088/ari"
echo ""
echo "  💡 To stop all services: docker-compose -f docker-compose.dev.yml down"
echo "  💡 To view logs: docker-compose -f docker-compose.dev.yml logs -f"
echo ""
