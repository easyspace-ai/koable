#!/usr/bin/env bash
# Run Doable web + api + ws against local Postgres (no Docker, no docore/dovault watch).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — run: bash scripts/setup-local.sh"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

DB_URL="${DATABASE_URL:-}"
if [[ -z "$DB_URL" ]]; then
  echo "DATABASE_URL is not set in .env"
  exit 1
fi

HOST="$(node -e "try{const u=new URL(process.argv[1].replace(/^postgres:/,'http:'));console.log(u.hostname||'localhost')}catch{console.log('localhost')}" "$DB_URL")"
PORT="$(node -e "try{const u=new URL(process.argv[1].replace(/^postgres:/,'http:'));console.log(u.port||5432)}catch{console.log(5432)}" "$DB_URL")"

if ! pg_isready -h "$HOST" -p "$PORT" >/dev/null 2>&1; then
  echo "Postgres not ready on ${HOST}:${PORT}. Start Postgres, then retry."
  exit 1
fi

echo "Starting Doable (web :3000, api :4000) — local Postgres, no Docker, no WS"
exec pnpm dev:local
