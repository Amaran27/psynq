#!/usr/bin/env pwsh
# Bring up infra + dev services (PowerShell)
$composeFiles = @('-f', 'deploy/mediasoup/docker-compose.yml', '-f', 'docker-compose.dev.yml')
Write-Host "Starting infra + dev services (may take a minute)..."
docker compose @composeFiles up -d --build
Write-Host "Services started. To follow logs run:"
Write-Host "  docker compose @composeFiles logs -f"