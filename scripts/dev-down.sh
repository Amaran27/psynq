#!/usr/bin/env bash
set -euo pipefail

# Tear down infra + dev services (Linux / macOS)
COMPOSE_FILES=("-f" "deploy/mediasoup/docker-compose.yml" "-f" "docker-compose.dev.yml")

echo "Stopping infra + dev services..."
docker compose "${COMPOSE_FILES[@]}" down

echo "Stopped."