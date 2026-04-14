#!/usr/bin/env bash
set -euo pipefail

# One-shot setup for fresh clones.
#   1) frontend deps (bun)
#   2) server deps (npm)
#   3) server/.env from example if missing
#   4) db reset (drops + re-seeds criteria.db)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }

step "1/4 frontend deps (bun)"
if ! command -v bun >/dev/null 2>&1; then
  echo "bun no está instalado. Instalalo con:"
  echo "  curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
( cd "$ROOT" && bun install )

step "2/4 server deps (npm)"
( cd "$ROOT/server" && npm install )

step "3/4 server/.env"
if [ ! -f "$ROOT/server/.env" ]; then
  cp "$ROOT/server/.env.example" "$ROOT/server/.env"
  echo "Creado server/.env — recordá completar ANTHROPIC_API_KEY"
else
  echo "server/.env ya existe, lo dejo como está"
fi

step "4/4 seed DB"
( cd "$ROOT/server" && npm run db:reset )

printf "\n\033[1;32m✔ setup listo\033[0m\n"
echo "levantar:"
echo "  (server)   cd server && npm run dev"
echo "  (front)    bun run dev"
