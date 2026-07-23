#!/usr/bin/env bash
# Deploy Rooma Ceritarasa ke VPS (Docker Compose production).
#
# Prasyarat di VPS:
#   - Repo sudah di-clone
#   - File .env.production ada (chmod 600)
#   - Docker + Compose terpasang
#
# Usage:
#   bash scripts/deploy.sh
#   bash scripts/deploy.sh --branch develop

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="develop"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      BRANCH="${2:?--branch requires a value}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:?--env-file requires a value}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: bash scripts/deploy.sh [--branch develop] [--env-file .env.production]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Create it from .env.production.example first." >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: $COMPOSE_FILE not found." >&2
  exit 1
fi

echo "==> Ensuring branch is up to date: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Building and starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "==> Waiting for app health..."
ATTEMPTS=40
SLEEP_SECONDS=5
for ((i=1; i<=ATTEMPTS; i++)); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T app \
    curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "App is healthy."
    break
  fi
  if [[ "$i" -eq "$ATTEMPTS" ]]; then
    echo "ERROR: App healthcheck timed out. Recent logs:" >&2
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=80 app db caddy >&2
    exit 1
  fi
  echo "  still waiting... ($i/$ATTEMPTS)"
  sleep "$SLEEP_SECONDS"
done

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo
echo "Deploy selesai."
echo "Cek kesehatan dari host (via Caddy):"
echo "  curl -fsS http://127.0.0.1/api/health"
echo "  # atau https://domain-anda/api/health setelah DNS + SITE_ADDRESS diset"
