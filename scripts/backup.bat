@echo off
REM Psynq Backup Script for Windows
REM Creates backup of database and configuration files

setlocal enabledelayedexpansion

echo ========================================
echo Psynq Backup Script
echo ========================================
echo.

REM Get timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%"

REM Create backup directory
if not exist "backups" mkdir backups
set "BACKUP_DIR=backups\%TIMESTAMP%"
if not exist "%BACKUP_DIR%" mkdir %BACKUP_DIR%

echo Backup directory: %BACKUP_DIR%
echo.

REM Check Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [1/4] Backing up PostgreSQL database...
set "DB_FILE=%BACKUP_DIR%\psynq-db-backup-%TIMESTAMP%.sql"

docker exec psynq-postgres-dev pg_dump -U psynq_user psynq_db > "%DB_FILE%" 2>&1
if errorlevel 1 (
    echo [ERROR] Database backup failed!
    pause
    exit /b 1
)

echo   Database backup: %DB_FILE%
for %%A in ("%DB_FILE%") do echo   Size: %%~zA bytes
echo.

echo [2/4] Backing up configuration files...
set "CONFIG_FILE=%BACKUP_DIR%\psynq-config-backup-%TIMESTAMP%.tar.gz"

if exist "deploy\config\.env" (
    powershell -Command "Compress-Archive -Path 'deploy\config' -DestinationPath '%BACKUP_DIR%\config-backup-%TIMESTAMP%.zip' -Force"
    echo   Configuration backup: %BACKUP_DIR%\config-backup-%TIMESTAMP%.zip
) else (
    echo   [WARNING] .env file not found, skipping config backup
)
echo.

echo [3/4] Backing up Asterisk configurations...
if exist "deploy\asterisk\asterisk-config" (
    powershell -Command "Compress-Archive -Path 'deploy\asterisk\asterisk-config' -DestinationPath '%BACKUP_DIR%\asterisk-config-backup-%TIMESTAMP%.zip' -Force"
    echo   Asterisk config backup: %BACKUP_DIR%\asterisk-config-backup-%TIMESTAMP%.zip
) else (
    echo   [WARNING] Asterisk config not found, skipping
)
echo.

echo [4/4] Creating backup manifest...
set "MANIFEST=%BACKUP_DIR%\backup-manifest.txt"
echo Psynq Backup Manifest > %MANIFEST%
echo Timestamp: %date% %time% >> %MANIFEST%
echo. >> %MANIFEST%
echo Files: >> %MANIFEST%
dir /b %BACKUP_DIR% >> %MANIFEST%
echo   Manifest: %MANIFEST%
echo.

echo ========================================
echo Backup Complete!
echo ========================================
echo.
echo Location: %BACKUP_DIR%
echo.
echo Contents:
dir /b %BACKUP_DIR%
echo.
echo To restore, run:
echo   cd scripts
echo   restore.bat
echo.
pause
