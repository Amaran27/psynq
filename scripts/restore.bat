@echo off
REM Psynq Restore Script for Windows
REM Restores database and configuration from backup

setlocal enabledelayedexpansion

echo ========================================
echo Psynq Restore Script
echo ========================================
echo.

REM Check if backup directory provided
if "%~1"=="" (
    echo Usage: restore.bat [backup_directory]
    echo.
    echo Available backups:
    dir /b /ad backups 2>nul
    if errorlevel 1 (
        echo No backups found in backups\ directory
    )
    pause
    exit /b 1
)

set "BACKUP_DIR=%~1"

REM Check backup directory exists
if not exist "%BACKUP_DIR%" (
    echo [ERROR] Backup directory not found: %BACKUP_DIR%
    pause
    exit /b 1
)

echo ========================================
echo WARNING: This will REPLACE current data!
echo ========================================
echo.
echo Backup to restore: %BACKUP_DIR%
echo.
echo This will:
echo   - Stop all services
echo   - Drop existing database
echo   - Restore database from backup
echo   - Restore configuration files
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo ========================================
echo Starting Restore
echo ========================================
echo.

REM Stop all services
echo [1/6] Stopping all services...
docker-compose -f docker-compose.dev.yml down
echo   Services stopped
echo.

REM Start PostgreSQL only
echo [2/6] Starting PostgreSQL...
docker-compose -f docker-compose.dev.yml up -d postgres
echo.

REM Wait for PostgreSQL to be ready
echo [3/6] Waiting for PostgreSQL to be ready...
:waitloop
docker exec psynq-postgres-dev pg_isready -U psynq_user >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto waitloop
)
echo   PostgreSQL is ready
echo.

REM Drop existing database
echo [4/6] Dropping existing database...
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "DROP DATABASE IF EXISTS psynq_db;"
echo   Database dropped
echo.

REM Create new database
echo [5/6] Creating new database...
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "CREATE DATABASE psynq_db;"
echo   Database created
echo.

REM Find database backup file
echo [6/6] Restoring database from backup...
for %%f in (%BACKUP_DIR%\psynq-db-backup-*.sql) do (
    set "DB_FILE=%%f"
    goto :found
)

echo [ERROR] No database backup found in %BACKUP_DIR%
pause
exit /b 1

:found
echo   Restoring from: !DB_FILE!
docker exec -i psynq-postgres-dev psql -U psynq_user -d psynq_db < "!DB_FILE!"
if errorlevel 1 (
    echo [ERROR] Database restore failed!
    pause
    exit /b 1
)
echo   Database restored
echo.

REM Restore configuration if exists
if exist "%BACKUP_DIR%\config-backup-*.zip" (
    echo Restoring configuration files...
    for %%f in (%BACKUP_DIR%\config-backup-*.zip) do (
        if exist "deploy\config" (
            rmdir /s /q deploy\config
        )
        powershell -Command "Expand-Archive -Path '%%f' -DestinationPath 'deploy' -Force"
        echo   Configuration restored
    )
)

REM Restore Asterisk config if exists
if exist "%BACKUP_DIR%\asterisk-config-backup-*.zip" (
    echo Restoring Asterisk configurations...
    for %%f in (%BACKUP_DIR%\asterisk-config-backup-*.zip) do (
        if exist "deploy\asterisk\asterisk-config" (
            rmdir /s /q deploy\asterisk\asterisk-config
        )
        powershell -Command "Expand-Archive -Path '%%f' -DestinationPath 'deploy\asterisk' -Force"
        echo   Asterisk configuration restored
    )
)

echo.
echo ========================================
echo Restore Complete!
echo ========================================
echo.
echo Starting all services...
docker-compose -f docker-compose.dev.yml up -d
echo.

echo Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

echo.
echo Verifying services...
docker-compose -f docker-compose.dev.yml ps
echo.
pause
