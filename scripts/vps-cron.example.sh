#!/usr/bin/env bash
# Contoh cron VPS untuk Rooma Ceritarasa.
# Salin ke VPS (mis. /opt/rooma/scripts/vps-cron.sh), chmod +x, lalu jadwalkan.
#
# Crontab contoh (waktu server = Asia/Jakarta lebih aman):
#   # Reminder H-1 — setiap hari jam 00:00 WIB (sesuaikan)
#   0 0 * * * /opt/rooma/scripts/vps-cron.sh reminders >> /var/log/rooma-cron.log 2>&1
#   # Auto no-show — setiap 15 menit
#   */15 * * * * /opt/rooma/scripts/vps-cron.sh no-show >> /var/log/rooma-cron.log 2>&1
#
# Butuh env:
#   APP_BASE_URL=https://your-domain.com   # atau http://127.0.0.1 jika Caddy di host yang sama
#   CRON_SECRET=...

set -euo pipefail

JOB="${1:-}"
if [[ -z "$JOB" ]]; then
  echo "Usage: $0 <reminders|no-show>" >&2
  exit 1
fi

: "${APP_BASE_URL:?APP_BASE_URL is required}"
: "${CRON_SECRET:?CRON_SECRET is required}"

case "$JOB" in
  reminders)
    PATH_SUFFIX="/api/cron/reminders"
    ;;
  no-show)
    PATH_SUFFIX="/api/cron/no-show"
    ;;
  *)
    echo "Unknown job: $JOB" >&2
    exit 1
    ;;
esac

URL="${APP_BASE_URL%/}${PATH_SUFFIX}"
echo "[$(date -Is)] Calling $URL"

curl -fsS -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  --max-time 60 \
  "$URL"

echo
echo "[$(date -Is)] OK"
