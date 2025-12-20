# Migration script to move from multi-provider to Asterisk-centric architecture
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Psynq Migration to Asterisk-Centric" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Phase 1: Backup current configuration
Write-Host "`n[Phase 1] Backing up current configuration..." -ForegroundColor Yellow
$backupDir = "backup\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force
if (Test-Path "packages\backend\src\adapters\infobip.adapter.ts") {
    Copy-Item "packages\backend\src\adapters\infobip.adapter.ts" $backupDir
}
Write-Host "✓ Backup completed" -ForegroundColor Green

# Phase 2: Clean up obsolete code
Write-Host "`n[Phase 2] Moving obsolete code to temp folder..." -ForegroundColor Yellow
# Already done manually
Write-Host "✓ Obsolete code moved to temp\obsolete\" -ForegroundColor Green

# Phase 3: Start Asterisk
Write-Host "`n[Phase 3] Starting Asterisk..." -ForegroundColor Yellow
Set-Location "deploy\asterisk"
docker-compose down
docker-compose up -d
Write-Host "✓ Asterisk starting..." -ForegroundColor Green

# Phase 4: Verify Asterisk is running
Write-Host "`n[Phase 4] Verifying Asterisk status..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$asteriskRunning = docker ps | Select-String "psynq-asterisk"
if ($asteriskRunning) {
    Write-Host "✓ Asterisk is running" -ForegroundColor Green
} else {
    Write-Host "✗ Asterisk failed to start" -ForegroundColor Red
    exit 1
}

# Phase 5: Instructions for next steps
Write-Host "`n[Next Steps]" -ForegroundColor Cyan
Write-Host "1. Configure Twilio SIP trunking in Twilio Console" -ForegroundColor White
Write-Host "2. Update credentials in deploy\asterisk\asterisk-config\pjsip.conf" -ForegroundColor White
Write-Host "3. Test SIP registration: docker exec -it psynq-asterisk asterisk -rx 'pjsip show registrations'" -ForegroundColor White
Write-Host "4. Test outbound call: docker exec -it psynq-asterisk asterisk -rx `"channel originate PJSIP/+1234567890@twilio-trunk application echo`"" -ForegroundColor White

Write-Host "`nMigration script completed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan