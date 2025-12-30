@echo off
REM Psynq One-Command Setup Script for Windows
REM This script automates the complete setup process

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   Psynq Telephony Platform - Automatic Setup
echo ============================================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not running
    echo 💡 Please start Docker Desktop and try again
    pause
    exit /b 1
)

echo ✅ Docker is running
echo.

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "deploy\config" mkdir deploy\config
if not exist "deploy\asterisk\asterisk-config\keys" mkdir deploy\asterisk\asterisk-config\keys
if not exist "deploy\db" mkdir deploy\db
echo ✅ Directories created
echo.

REM Generate .env file if it doesn't exist
if not exist "deploy\config\.env" (
    echo 📝 Generating .env file...
    copy deploy\config\.env.template deploy\config\.env >nul

    REM Generate secure random passwords
    for /f "tokens=*" %%a in ('powershell -Command "[convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])"') do set JWT_SECRET=%%a
    for /f "tokens=*" %%a in ('powershell -Command "[convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])"') do set SESSION_SECRET=%%a

    REM Append secrets to .env
    echo JWT_SECRET=%JWT_SECRET%>> deploy\config\.env
    echo SESSION_SECRET=%SESSION_SECRET%>> deploy\config\.env

    echo ✅ .env file generated with secure passwords
) else (
    echo ✅ .env file already exists, skipping...
)
echo.

REM Build and start services
echo 🚀 Starting Docker containers...
docker-compose -f docker-compose.dev.yml build
if errorlevel 1 (
    echo ❌ Error: Docker build failed
    pause
    exit /b 1
)

docker-compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
    echo ❌ Error: Docker compose failed
    pause
    exit /b 1
)

echo ✅ Containers started
echo.

REM Wait for database to be healthy
echo ⏳ Waiting for database to be healthy...
set MAX_WAIT=60
set WAIT_COUNT=0

:waitloop
set HEALTHY=0
for /f "tokens=*" %%a in ('docker ps --filter "name=psynq-postgres" --format "{{.Status}}"') do (
    echo %%a | findstr /i "healthy" >nul
    if not errorlevel 1 set HEALTHY=1
)

if !HEALTHY!==1 (
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

REM Initialize database
echo 📊 Initializing database schema...
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
if errorlevel 1 (
    echo ⚠️  Warning: PJSIP schema creation had issues (may already exist)
)

docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/03-seed-data.sql
if errorlevel 1 (
    echo ⚠️  Warning: Seed data insertion had issues (may already exist)
)

echo ✅ Database initialized
echo.

REM Wait for all services to be healthy
echo ⏳ Waiting for all services to be ready...
timeout /t 10 /nobreak >nul

REM Verify services
echo 🔍 Verifying services...
docker-compose -f docker-compose.dev.yml ps
echo.

REM Get container statuses
for /f "tokens=*" %%a in ('docker ps --filter "name=psynq-" --format "{{.Names}}: {{.Status}}"') do (
    echo   %%a
)
echo.

echo ============================================================
echo   🎉 SETUP COMPLETE!
echo ============================================================
echo.
echo   🌐 Web Interface: http://localhost:3000
echo   🔐 Login: sysadmin@psynq.local / PsynqSecure2025!!
echo.
echo   📊 Backend API: http://localhost:3001
echo   📞 Asterisk ARI: http://localhost:8088/ari
echo.
echo   💡 To stop all services: docker-compose -f docker-compose.dev.yml down
echo   💡 To view logs: docker-compose -f docker-compose.dev.yml logs -f
echo.
pause
