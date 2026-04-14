# criteria

Plataforma socrática para acompañar el pensamiento del alumno.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind (bun)
- **Backend**: Node + Fastify + TypeScript + better-sqlite3 + `@anthropic-ai/sdk` (npm)
- **DB**: SQLite local (`server/criteria.db`)
- **Auth demo**: header `x-user-id`

## Estructura

```
criterIA/
├── src/                # frontend
├── server/             # backend (proyecto independiente)
│   └── src/
│       ├── contracts.ts   # tipos compartidos, importados desde el FE con @contracts
│       ├── schema.sql
│       ├── seed.ts
│       ├── server.ts
│       ├── teacher-routes.ts, teacher-agents.ts
│       ├── student-routes.ts
│       └── socratic/      # motor del tutor
└── docs/
```

## Setup (una sola vez)

```bash
./setup.sh
```

Instala las dependencias del frontend y del server, crea `server/.env` a
partir del ejemplo, y seedea la base. Después editá `server/.env` y
completá `ANTHROPIC_API_KEY`.

Requiere tener `bun` instalado (`curl -fsSL https://bun.sh/install | bash`).

## Levantar en local

```bash
# terminal 1 — server
cd server && npm run dev       # http://localhost:3001

# terminal 2 — frontend
bun run dev                    # http://localhost:5173
```

El frontend proxya `/api` a `localhost:3001`.

## Auth demo

Todas las rutas (excepto `/api/health`) requieren header `x-user-id`. El FE lo
guarda en `localStorage` y tiene un selector en la UI para alternar entre los
usuarios del seed:

- Docentes: `yairp`, `rosariom`
- Alumnos: `sofiam`, `mateol`, `valentinag`, `thiagor`, `camilaf`, `benjamind`
