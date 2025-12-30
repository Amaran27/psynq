@echo off
REM Reset Database Script for Psynq (Windows)
REM WARNING: This will delete ALL data in the database

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   ⚠️  DANGER ZONE - DATABASE RESET
echo ============================================================
echo.
echo   This will DELETE ALL DATA and reset the database!
echo.
echo   Press Ctrl+C to cancel, or
pause
echo.

echo 🛑 Stopping all services...
docker-compose -f docker-compose.dev.yml down
echo ✅ Services stopped
echo.

echo 🗑️  Removing database volume...
docker volume rm psynq_pgdata 2>nul
echo ✅ Volume removed
echo.

echo 🚀 Starting services...
docker-compose -f docker-compose.dev.yml up -d postgres
echo ✅ PostgreSQL started
echo.

echo ⏳ Waiting for database to be healthy...
set MAX_WAIT=60
set WAIT_COUNT=0

:waitloop
docker ps --filter "name=psynq-postgres" --format "{{.Status}}" | findstr /i "healthy" >nul
if not errorlevel 1 (
    echo ✅ Database is healthy
    goto :continue
)

set /a WAIT_COUNT+=1
if !WAIT_COUNT! geq %MAX_WAIT% (
    echo ❌ Error: Database did not become healthy
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
goto :waitloop

:continue
echo.

echo 📊 Rebuilding database schema...
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "DROP DATABASE IF EXISTS psynq_db;"
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "CREATE DATABASE psynq_DB;"
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/03-seed-data.sql
echo ✅ Database rebuilt
echo.

echo 🚀 Starting all services...
docker-compose -f docker-compose.dev.yml up -d
echo ✅ All services started
echo.

echo 🎉 Database reset complete!
echo.
echo   🔐 Login: sysadmin@psynq.local / PsynqSecure2025!!
echo.
pause
