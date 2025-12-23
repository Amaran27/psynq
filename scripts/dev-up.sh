#!/usr/bin/env bash
set -euo pipefail

# Bring up infra + dev services (Linux / macOS)
COMPOSE_FILES=("-f" "deploy/mediasoup/docker-compose.yml" "-f" "docker-compose.dev.yml")

echo "Starting infra + dev services (may take a minute)..."
docker compose "${COMPOSE_FILES[@]}" up -d --build

echo "Services started. To follow logs run:"
echo "  docker compose ${COMPOSE_FILES[@]} logs -f" 
