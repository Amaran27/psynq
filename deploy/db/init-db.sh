#!/bin/bash
# Database Initialization Script for Psynq
# This script orchestrates the complete database setup process

set -e  # Exit on error

echo "🔧 Initializing Psynq Database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; do
    echo "   PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "✅ PostgreSQL is ready!"

# Create database if it doesn't exist
echo "📝 Creating database $DB_DATABASE..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_DATABASE'" | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_DATABASE;"
echo "✅ Database created!"

# Run PJSIP schema
echo "📊 Creating PJSIP tables..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_DATABASE" -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
echo "✅ PJSIP tables created!"

# Run seed data
echo "🌱 Seeding initial data..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_DATABASE" -f /docker-entrypoint-initdb.d/03-seed-data.sql
echo "✅ Seed data inserted!"

# Verify tables exist
echo "🔍 Verifying database schema..."
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ps_%';")
echo "✅ Found $TABLE_COUNT PJSIP tables"

echo "🎉 Database initialization complete!"
