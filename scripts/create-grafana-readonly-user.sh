#!/usr/bin/env bash
# Buat / update user Postgres read-only untuk Grafana.
# Usage (di VPS, dari /opt/rooma-ceritarasa):
#   sudo bash scripts/create-grafana-readonly-user.sh
#
# Membaca GRAFANA_DB_* dan POSTGRES_* dari .env.production.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"

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
GRAFANA_DB_USER="$(env_get GRAFANA_DB_USER)"
GRAFANA_DB_PASSWORD="$(env_get GRAFANA_DB_PASSWORD)"

: "${POSTGRES_USER:?POSTGRES_USER missing in .env.production}"
: "${POSTGRES_DB:?POSTGRES_DB missing in .env.production}"
: "${GRAFANA_DB_USER:=grafana_ro}"
: "${GRAFANA_DB_PASSWORD:?GRAFANA_DB_PASSWORD missing in .env.production — tambahkan dulu}"

if [[ ! "${GRAFANA_DB_USER}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "ERROR: GRAFANA_DB_USER tidak valid: ${GRAFANA_DB_USER}" >&2
  exit 1
fi
if [[ ! "${POSTGRES_DB}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "ERROR: POSTGRES_DB tidak valid: ${POSTGRES_DB}" >&2
  exit 1
fi

if ! sudo docker compose -f "${ROOT_DIR}/docker-compose.production.yml" --env-file "${ENV_FILE}" ps --status running --services 2>/dev/null | grep -qx db; then
  echo "ERROR: container db tidak running." >&2
  exit 1
fi

# Escape single quotes for SQL string literal
sql_password="${GRAFANA_DB_PASSWORD//\'/\'\'}"

sudo docker compose -f "${ROOT_DIR}/docker-compose.production.yml" --env-file "${ENV_FILE}" exec -T db \
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${GRAFANA_DB_USER}') THEN
    CREATE ROLE ${GRAFANA_DB_USER} LOGIN PASSWORD '${sql_password}';
  ELSE
    ALTER ROLE ${GRAFANA_DB_USER} WITH LOGIN PASSWORD '${sql_password}';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${GRAFANA_DB_USER};
GRANT USAGE ON SCHEMA public TO ${GRAFANA_DB_USER};
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${GRAFANA_DB_USER};
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ${GRAFANA_DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${GRAFANA_DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO ${GRAFANA_DB_USER};
SQL

echo "OK: role '${GRAFANA_DB_USER}' siap (SELECT only) di database '${POSTGRES_DB}'."
