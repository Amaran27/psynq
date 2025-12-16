#!/usr/bin/env bash
set -euo pipefail

# Safe migration runner for deployment scripts
# Usage: ./scripts/migrate.sh

if [ -z "${DB_HOST:-}" ]; then
  echo "Warning: DB_HOST not set. Using defaults from package.json (local dev)."
fi

echo "Running TypeORM migrations..."
npm run migration:run

echo "Migrations complete."
