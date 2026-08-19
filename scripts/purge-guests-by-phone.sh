#!/usr/bin/env bash
# Hapus data tamu testing (guest + reservasi terkait) berdasarkan nomor HP.
#
# Usage (di VPS):
#   cd /opt/rooma-ceritarasa
#   sudo bash scripts/backup-db.sh
#   sudo bash scripts/purge-guests-by-phone.sh --dry-run
#   sudo bash scripts/purge-guests-by-phone.sh --execute
#
# Atau dengan nomor custom:
#   sudo bash scripts/purge-guests-by-phone.sh --execute 081234567890 089876543210

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"

MODE="dry-run"
PHONES=(
  "082213727732"
  "082256345353"
  "082150754301"
)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      shift
      ;;
    --execute)
      MODE="execute"
      shift
      ;;
    -h|--help)
      echo "Usage: bash scripts/purge-guests-by-phone.sh [--dry-run|--execute] [phone ...]"
      exit 0
      ;;
    *)
      PHONES=("$@")
      MODE="${MODE:-dry-run}"
      break
      ;;
  esac
done

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} tidak ditemukan." >&2
  exit 1
fi

env_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  [[ -z "${line}" ]] && return 0
  printf '%s\n' "${line#*=}"
}

POSTGRES_USER="$(env_get POSTGRES_USER)"
POSTGRES_DB="$(env_get POSTGRES_DB)"
: "${POSTGRES_USER:?POSTGRES_USER missing in .env.production}"
: "${POSTGRES_DB:?POSTGRES_DB missing in .env.production}"

if ! sudo docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running --services 2>/dev/null | grep -qx db; then
  echo "ERROR: container db tidak running." >&2
  exit 1
fi

# Build SQL array literal: ARRAY['08...','62...']
phone_variants=()
for raw in "${PHONES[@]}"; do
  p="${raw// /}"
  p="${p//-/}"
  phone_variants+=("$p")
  if [[ "$p" == 0* ]]; then
    phone_variants+=("62${p:1}")
    phone_variants+=("+62${p:1}")
  elif [[ "$p" == +62* ]]; then
    phone_variants+=("0${p:3}")
    phone_variants+=("62${p:3}")
  elif [[ "$p" == 62* ]]; then
    phone_variants+=("0${p:2}")
    phone_variants+=("+${p}")
  fi
done

# Dedupe
mapfile -t UNIQUE_PHONES < <(printf '%s\n' "${phone_variants[@]}" | awk '!seen[$0]++')
SQL_ARRAY="$(printf "'%s'," "${UNIQUE_PHONES[@]}")"
SQL_ARRAY="ARRAY[${SQL_ARRAY%,}]"

run_sql() {
  sudo docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T db \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 "$@"
}

echo "==> Mode: ${MODE}"
echo "==> Nomor HP (termasuk varian 62/+62): ${UNIQUE_PHONES[*]}"
echo

echo "==> Preview tamu yang cocok:"
run_sql -c "
SELECT id, name, phone, deleted_at, created_at
FROM guests
WHERE phone = ANY(${SQL_ARRAY})
ORDER BY phone, created_at;
"

echo
echo "==> Preview reservasi terkait:"
run_sql -c "
SELECT r.id, r.date, r.status, g.name, g.phone
FROM reservations r
JOIN guests g ON g.id = r.guest_id
WHERE g.phone = ANY(${SQL_ARRAY})
ORDER BY r.date DESC;
"

echo
echo "==> Ringkasan jumlah data:"
run_sql -c "
WITH target_guests AS (
  SELECT id FROM guests WHERE phone = ANY(${SQL_ARRAY})
),
target_reservations AS (
  SELECT id FROM reservations WHERE guest_id IN (SELECT id FROM target_guests)
)
SELECT 'guests' AS entity, COUNT(*)::int AS total FROM target_guests
UNION ALL
SELECT 'reservations', COUNT(*)::int FROM target_reservations
UNION ALL
SELECT 'reservation_tables', COUNT(*)::int
FROM reservation_tables WHERE reservation_id IN (SELECT id FROM target_reservations)
UNION ALL
SELECT 'check_ins', COUNT(*)::int
FROM check_ins WHERE reservation_id IN (SELECT id FROM target_reservations)
UNION ALL
SELECT 'payments', COUNT(*)::int
FROM payments WHERE reservation_id IN (SELECT id FROM target_reservations)
UNION ALL
SELECT 'guest_notes', COUNT(*)::int
FROM guest_notes WHERE guest_id IN (SELECT id FROM target_guests)
UNION ALL
SELECT 'vip_cards', COUNT(*)::int
FROM vip_cards WHERE guest_id IN (SELECT id FROM target_guests)
UNION ALL
SELECT 'career_applications', COUNT(*)::int
FROM career_applications WHERE applicant_phone = ANY(${SQL_ARRAY});
"

if [[ "${MODE}" != "execute" ]]; then
  echo
  echo "Dry-run selesai. Tidak ada data dihapus."
  echo "Jalankan backup dulu, lalu:"
  echo "  sudo bash scripts/purge-guests-by-phone.sh --execute"
  exit 0
fi

echo
read -r -p "Ketik YES untuk menghapus permanen data di atas: " CONFIRM
if [[ "${CONFIRM}" != "YES" ]]; then
  echo "Dibatalkan."
  exit 1
fi

echo "==> Menghapus data..."
run_sql <<SQL
BEGIN;

CREATE TEMP TABLE tmp_target_guests AS
SELECT id FROM guests WHERE phone = ANY(${SQL_ARRAY});

CREATE TEMP TABLE tmp_target_reservations AS
SELECT id FROM reservations WHERE guest_id IN (SELECT id FROM tmp_target_guests);

DELETE FROM check_ins
WHERE reservation_id IN (SELECT id FROM tmp_target_reservations);

DELETE FROM payments
WHERE reservation_id IN (SELECT id FROM tmp_target_reservations);

DELETE FROM reservation_tables
WHERE reservation_id IN (SELECT id FROM tmp_target_reservations);

DELETE FROM notifications
WHERE related_id IN (SELECT id FROM tmp_target_reservations)
   OR related_id IN (SELECT id FROM tmp_target_guests);

DELETE FROM reservations
WHERE id IN (SELECT id FROM tmp_target_reservations);

DELETE FROM guest_notes
WHERE guest_id IN (SELECT id FROM tmp_target_guests);

DELETE FROM vip_cards
WHERE guest_id IN (SELECT id FROM tmp_target_guests);

DELETE FROM guests
WHERE id IN (SELECT id FROM tmp_target_guests);

DELETE FROM career_applications
WHERE applicant_phone = ANY(${SQL_ARRAY});

COMMIT;
SQL

echo
echo "==> Verifikasi (seharusnya 0 baris):"
run_sql -c "
SELECT COUNT(*) AS remaining_guests
FROM guests
WHERE phone = ANY(${SQL_ARRAY});
"

echo
echo "Selesai. Data testing untuk nomor tersebut sudah dihapus."
