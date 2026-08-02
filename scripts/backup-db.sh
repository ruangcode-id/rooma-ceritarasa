#!/usr/bin/env bash
# Backup Postgres production (Docker) → file .sql.gz di host.
#
# Usage (di VPS):
#   sudo bash /opt/rooma-ceritarasa/scripts/backup-db.sh
#
# Crontab (setiap hari jam 03:00):
#   0 3 * * * /opt/rooma-ceritarasa/scripts/backup-db.sh >> /var/log/rooma-backup.log 2>&1
#
# Restore (contoh):
#   gunzip -c /var/backups/rooma-ceritarasa/rooma_db_YYYYMMDD_HHMMSS.sql.gz \
#     | sudo docker compose -f /opt/rooma-ceritarasa/docker-compose.production.yml \
#         --env-file /opt/rooma-ceritarasa/.env.production \
#         exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#
# Catatan restore: biasanya ke DB kosong / hati-hati menimpa data hidup.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/rooma-ceritarasa}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

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
  printf '%s\n' "${line#*=}"
}

POSTGRES_USER="$(env_get POSTGRES_USER)"
POSTGRES_DB="$(env_get POSTGRES_DB)"
# Optional overrides from .env.production
_backup_dir_env="$(env_get BACKUP_DIR)"
_retention_env="$(env_get BACKUP_RETENTION_DAYS)"
[[ -n "${_backup_dir_env}" ]] && BACKUP_DIR="${_backup_dir_env}"
[[ -n "${_retention_env}" ]] && RETENTION_DAYS="${_retention_env}"

: "${POSTGRES_USER:?POSTGRES_USER missing in .env.production}"
: "${POSTGRES_DB:?POSTGRES_DB missing in .env.production}"

if [[ ! "${POSTGRES_USER}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "ERROR: POSTGRES_USER tidak valid" >&2
  exit 1
fi
if [[ ! "${POSTGRES_DB}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "ERROR: POSTGRES_DB tidak valid" >&2
  exit 1
fi
if [[ ! "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] || [[ "${RETENTION_DAYS}" -lt 1 ]]; then
  echo "ERROR: BACKUP_RETENTION_DAYS harus angka >= 1" >&2
  exit 1
fi

if ! sudo docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running --services 2>/dev/null | grep -qx db; then
  echo "ERROR: container db tidak running." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${STAMP}.sql.gz"
TMP_FILE="${OUT_FILE}.partial"

echo "[$(date -Is)] Backup mulai → ${OUT_FILE}"

sudo docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-acl \
  | gzip -c > "${TMP_FILE}"

mv "${TMP_FILE}" "${OUT_FILE}"
chmod 600 "${OUT_FILE}"

SIZE="$(du -h "${OUT_FILE}" | awk '{print $1}')"
echo "[$(date -Is)] OK (${SIZE})"

# Hapus backup lebih tua dari RETENTION_DAYS
DELETED="$(find "${BACKUP_DIR}" -type f -name "${POSTGRES_DB}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
echo "[$(date -Is)] Retensi ${RETENTION_DAYS} hari — dihapus: ${DELETED} file"
