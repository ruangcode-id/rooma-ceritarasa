#!/usr/bin/env bash
# Dokumentasi saja — jalankan scripts/vps-cron.sh di production.
#
# scripts/vps-cron.sh membaca CRON_SECRET + NEXT_PUBLIC_APP_URL dari .env.production.
#
# Crontab (root), timezone Asia/Jakarta:
#   0 0 * * * /opt/rooma-ceritarasa/scripts/vps-cron.sh reminders >> /var/log/rooma-cron.log 2>&1
#   */15 * * * * /opt/rooma-ceritarasa/scripts/vps-cron.sh no-show >> /var/log/rooma-cron.log 2>&1
#   0 3 * * * /opt/rooma-ceritarasa/scripts/backup-db.sh >> /var/log/rooma-backup.log 2>&1
#
# Tes manual:
#   sudo bash /opt/rooma-ceritarasa/scripts/vps-cron.sh reminders
#   sudo bash /opt/rooma-ceritarasa/scripts/vps-cron.sh no-show

echo "Gunakan scripts/vps-cron.sh (bukan file contoh ini)." >&2
exit 1
