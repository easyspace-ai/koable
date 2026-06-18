# Local development (Postgres on host, no Docker)

Use this path when you run **PostgreSQL natively** on macOS/Linux and do **not** use `deployment/docker/setup.sh`.

## Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+ listening on `localhost:5432`

## One-time setup

```bash
# From repo root
bash scripts/setup-local.sh
```

This copies `.env.example` → `.env` if missing, checks Postgres, runs `pnpm install` and `pnpm db:migrate`.

### Postgres database (if not created yet)

Default connection (matches `.env.example`):

```
postgres://doable:doable_secret@localhost:5432/doable
```

Example on macOS with Homebrew:

```bash
brew services start postgresql@16
createuser -s doable 2>/dev/null || true
createdb -O doable doable 2>/dev/null || true
psql postgres -c "ALTER USER doable PASSWORD 'doable_secret';"
```

## Daily dev

```bash
pnpm dev:local
# or
bash scripts/dev-local.sh
```

| Service | URL | Required? |
|---------|-----|-----------|
| Web | http://localhost:3000 | Yes |
| API | http://localhost:4000 | Yes |
| WebSocket | ws://localhost:4001 | No (collaboration only) |

`dev:local` starts **only** `@doable/web` and `@doable/api`. It does **not** start Docker, Caddy, the WebSocket server (`@doable/ws`), or extra `tsc --watch` tasks for `docore` / `dovault`.

**WebSocket (`pnpm dev:ws`)** is only needed for **multi-user collaboration** (live cursors, presence, team chat). Solo development works without it.

### Run services separately

```bash
pnpm dev:web    # frontend only
pnpm dev:api    # backend + AI + preview
pnpm dev:ws     # collaboration only (optional)
```

## Required `.env` values (local)

These should already be set in `.env.example`:

| Variable | Local value |
|----------|-------------|
| `DATABASE_URL` | `postgres://doable:doable_secret@localhost:5432/doable` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:4001` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |
| `PROJECTS_ROOT` / `DOABLE_PROJECTS_DIR` | `./projects` |
| `NODE_ENV` | `development` |

No Docker-specific variables are required.

## Troubleshooting

- **Postgres connection refused** — start Postgres (`brew services start postgresql@16` or `pg_ctl`).
- **Migrations** — `pnpm db:migrate` from repo root.
- **Machine feels frozen on startup** — `@doable/web` defaults to **Webpack** dev (`next dev --webpack`) to avoid Turbopack scanning the whole monorepo. If you still run out of RAM on a 16GB machine, close extra Cursor MCP tabs and use `pnpm dev:local` (not full `pnpm dev`). Faster rebuilds: `pnpm dev:web -- --turbopack` inside `apps/web` (`dev:turbo`).
- **Port in use / “Another next dev server is already running”** — stop leftover processes: `pnpm dev:stop`, then `pnpm dev:local`.
- **Registration/login CORS error** — dev server binds to `127.0.0.1:3000` but `.env` may only list `localhost`. API now accepts both loopback origins in dev; restart API after pulling. Or open http://localhost:3000 instead.
