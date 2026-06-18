#!/usr/bin/env bash
# Bootstrap Doable for local development: native Postgres, no Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Doable local setup (Postgres on host, no Docker)"

if [[ ! -f .env ]]; then
  echo "    Creating .env from .env.example"
  cp .env.example .env
  echo "    Edit .env if your Postgres user/password/database differ."
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

DB_URL="${DATABASE_URL:-postgres://doable:doable_secret@localhost:5432/doable}"
echo "==> Checking Postgres (${DB_URL%%@*}@...)"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "ERROR: pg_isready not found. Install Postgres 16+ (e.g. brew install postgresql@16)."
  exit 1
fi

HOST="$(node -e "try{const u=new URL(process.argv[1].replace(/^postgres:/,'http:'));console.log(u.hostname||'localhost')}catch{console.log('localhost')}" "$DB_URL")"
PORT="$(node -e "try{const u=new URL(process.argv[1].replace(/^postgres:/,'http:'));console.log(u.port||5432)}catch{console.log(5432)}" "$DB_URL")"

if ! pg_isready -h "$HOST" -p "$PORT" >/dev/null 2>&1; then
  echo "ERROR: Postgres is not accepting connections on ${HOST}:${PORT}."
  echo "       Start it (e.g. brew services start postgresql@16) then re-run."
  exit 1
fi

if ! psql "$DB_URL" -c "SELECT 1" >/dev/null 2>&1; then
  echo "ERROR: Cannot connect with DATABASE_URL from .env."
  echo "       Create role/database, e.g.:"
  echo "         createuser -s doable 2>/dev/null || true"
  echo "         createdb -O doable doable 2>/dev/null || true"
  echo "         psql postgres -c \"ALTER USER doable PASSWORD 'doable_secret';\""
  exit 1
fi

echo "==> Installing dependencies (pnpm install)"
pnpm install

echo "==> Running database migrations"
pnpm db:migrate

echo ""
echo "Setup complete. Start the stack with:"
echo "  pnpm dev:local"
echo ""
echo "Then open: http://localhost:3000"
