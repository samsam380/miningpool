#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Update secrets before running in production."
fi

mkdir -p miningcore/logs

CONFIG_FILE="miningcore/config.json"
if [[ -f "$CONFIG_FILE" ]] && grep -q '"manager"[[:space:]]*:[[:space:]]*"integrated"' "$CONFIG_FILE"; then
  sed -i 's/"manager"[[:space:]]*:[[:space:]]*"integrated"/"manager": "Integrated"/g' "$CONFIG_FILE"
  echo "Patched miningcore/config.json: banning.manager set to Integrated"
fi

echo "Building Miningcore from ${MININGCORE_REPO:-https://github.com/coinfoundry/miningcore.git} (${MININGCORE_REF:-master})"
echo "Starting pool stack..."
docker compose pull postgres redis web
docker compose build miningcore
docker compose up -d

echo "Pool stack started."
echo "Frontend: http://<server-ip>:8080"
echo "Pool stratum (shared): stratum+tcp://<server-ip>:3333"
echo "Pool stratum (solo):   stratum+tcp://<server-ip>:3334"
