# criteria

Plataforma socrática para acompañar el pensamiento del alumno.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui (bun)
- **Backend**: Node + Fastify + TypeScript + better-sqlite3 + `@anthropic-ai/sdk` (npm)
- **DB**: SQLite local (`server/criteria.db`)
- **Auth demo**: header `x-user-id`

## Estructura

```
criterIA/
├── src/                # frontend (Vite)
│   ├── components/ui/  # primitives shadcn
│   ├── pages/
│   │   ├── teacher/    # /profesor
│   │   └── student/    # /estudiante
│   ├── data/mockData.ts
│   ├── hooks/
│   └── lib/            # api (x-user-id), queryClient, utils
├── server/             # backend (proyecto independiente)
│   └── src/
│       ├── contracts.ts   # tipos compartidos (importados desde el FE con @contracts)
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

Instala dependencias del frontend y del server, copia `server/.env` del
ejemplo, y seedea la base. Después editá `server/.env` y completá
`ANTHROPIC_API_KEY`.

Requiere `bun` (`curl -fsSL https://bun.sh/install | bash`).

## Levantar en local

Un solo comando para correr ambos procesos:

```bash
bun run dev:all
```

Levanta el frontend (Vite, http://localhost:5173) y el server
(Fastify, http://localhost:3001) en paralelo. `Ctrl+C` cierra los dos.

Si preferís terminales separadas:

```bash
# terminal 1 — server
cd server && npm run dev

# terminal 2 — frontend
bun run dev
```

## Auth demo

Todas las rutas (excepto `/api/health`) requieren header `x-user-id`. El FE lo
guarda en `localStorage`; hay un selector en el sidebar para alternar entre
los usuarios del seed:

- Docentes: `yairp`, `rosariom`
- Alumnos: `sofiam`, `mateol`, `valentinag`, `thiagor`, `camilaf`, `benjamind`
