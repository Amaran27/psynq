#!/bin/bash
# Reset Database Script for Psynq (Linux/Mac)
# WARNING: This will delete ALL data in the database

set -e

echo ""
echo "============================================================"
echo "  ⚠️  DANGER ZONE - DATABASE RESET"
echo "============================================================"
echo ""
echo "  This will DELETE ALL DATA and reset the database!"
echo ""
echo "  Press Ctrl+C to cancel, or"
read -p "  Press Enter to continue..."
echo ""

echo "🛑 Stopping all services..."
docker-compose -f docker-compose.dev.yml down
echo "✅ Services stopped"
echo ""

echo "🗑️  Removing database volume..."
docker volume rm psynq_pgdata 2>/dev/null || true
echo "✅ Volume removed"
echo ""

echo "🚀 Starting services..."
docker-compose -f docker-compose.dev.yml up -d postgres
echo "✅ PostgreSQL started"
echo ""

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

echo "📊 Rebuilding database schema..."
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "DROP DATABASE IF EXISTS psynq_db;"
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "CREATE DATABASE psynq_db;"
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/03-seed-data.sql
echo "✅ Database rebuilt"
echo ""

echo "🚀 Starting all services..."
docker-compose -f docker-compose.dev.yml up -d
echo "✅ All services started"
echo ""

echo "🎉 Database reset complete!"
echo ""
echo "  🔐 Login: sysadmin@psynq.local / PsynqSecure2025!!"
echo ""
