#!/usr/bin/env bash
# Panggil cron app Rooma (reminders / no-show) dari VPS.
#
# Usage:
#   sudo bash /opt/rooma-ceritarasa/scripts/vps-cron.sh reminders
#   sudo bash /opt/rooma-ceritarasa/scripts/vps-cron.sh no-show
#
# Crontab (root), timezone server Asia/Jakarta:
#   0 0 * * * /opt/rooma-ceritarasa/scripts/vps-cron.sh reminders >> /var/log/rooma-cron.log 2>&1
#   */15 * * * * /opt/rooma-ceritarasa/scripts/vps-cron.sh no-show >> /var/log/rooma-cron.log 2>&1

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"

JOB="${1:-}"
if [[ -z "${JOB}" ]]; then
  echo "Usage: $0 <reminders|no-show>" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} tidak ditemukan." >&2
  exit 1
fi

env_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  if [[ -z "${line}" ]]; then
    echo ""
    return 0
  fi
  # Hapus kutip pembungkus opsional
  local val="${line#*=}"
  val="${val#\"}"
  val="${val%\"}"
  val="${val#\'}"
  val="${val%\'}"
  printf '%s\n' "${val}"
}

CRON_SECRET="$(env_get CRON_SECRET)"
APP_BASE_URL="$(env_get NEXT_PUBLIC_APP_URL)"
# Fallback kalau NEXT_PUBLIC_APP_URL kosong
if [[ -z "${APP_BASE_URL}" ]]; then
  APP_BASE_URL="$(env_get AUTH_URL)"
fi
if [[ -z "${APP_BASE_URL}" ]]; then
  APP_BASE_URL="https://roomaceritarasa.com"
fi

: "${CRON_SECRET:?CRON_SECRET missing/empty in .env.production}"

case "${JOB}" in
  reminders)
    PATH_SUFFIX="/api/cron/reminders"
    ;;
  no-show)
    PATH_SUFFIX="/api/cron/no-show"
    ;;
  *)
    echo "Unknown job: ${JOB}" >&2
    exit 1
    ;;
esac

URL="${APP_BASE_URL%/}${PATH_SUFFIX}"
echo "[$(date -Is)] Calling ${URL}"

curl -fsS -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  --max-time 60 \
  "${URL}"

echo
echo "[$(date -Is)] OK"
