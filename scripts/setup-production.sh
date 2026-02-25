#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Update secrets before running in production."
fi

mkdir -p miningcore/logs

echo "Starting pool stack..."
docker compose up -d

echo "Pool stack started."
echo "Frontend: http://<server-ip>:8080"
echo "Pool stratum (shared): stratum+tcp://<server-ip>:3333"
echo "Pool stratum (solo):   stratum+tcp://<server-ip>:3334"
