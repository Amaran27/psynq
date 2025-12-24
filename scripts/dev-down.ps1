#!/usr/bin/env pwsh
# Tear down infra + dev services (PowerShell)
$composeFiles = @('-f', 'docker-compose.dev.yml')
Write-Host "Stopping infra + dev services..."
docker compose @composeFiles down
Write-Host "Stopped."