# Database Initialization Script for Psynq (Windows PowerShell)
# This script orchestrates the complete database setup process

$ErrorActionPreference = "Stop"

Write-Host "🔧 Initializing Psynq Database..." -ForegroundColor Cyan

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$env:PGPASSWORD = $env:DB_PASSWORD
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        psql -h $env:DB_HOST -U $env:DB_USER -d postgres -c '\q' 2>&1 | Out-Null
        break
    } catch {
        $retryCount++
        Write-Host "   PostgreSQL is unavailable - waiting... ($retryCount/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green

# Create database if it doesn't exist
Write-Host "📝 Creating database $env:DB_DATABASE..." -ForegroundColor Yellow
$dbExists = psql -h $env:DB_HOST -U $env:DB_USER -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$env:DB_DATABASE';" 2>&1
if (-not $dbExists) {
    psql -h $env:DB_HOST -U $env:DB_USER -d postgres -c "CREATE DATABASE $env:DB_DATABASE;"
}
Write-Host "✅ Database created!" -ForegroundColor Green

# Run PJSIP schema
Write-Host "📊 Creating PJSIP tables..." -ForegroundColor Yellow
psql -h $env:DB_HOST -U $env:DB_USER -d $env:DB_DATABASE -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
Write-Host "✅ PJSIP tables created!" -ForegroundColor Green

# Run seed data
Write-Host "🌱 Seeding initial data..." -ForegroundColor Yellow
psql -h $env:DB_HOST -U $env:DB_USER -d $env:DB_DATABASE -f /docker-entrypoint-initdb.d/03-seed-data.sql
Write-Host "✅ Seed data inserted!" -ForegroundColor Green

# Verify tables exist
Write-Host "🔍 Verifying database schema..." -ForegroundColor Yellow
$tableCount = psql -h $env:DB_HOST -U $env:DB_USER -d $env:DB_DATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ps_%';"
Write-Host "✅ Found $tableCount PJSIP tables" -ForegroundColor Green

Write-Host "🎉 Database initialization complete!" -ForegroundColor Green
