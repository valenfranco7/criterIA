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

## Levantar en local

### Frontend

```bash
bun install
bun run dev            # http://localhost:5173
```

### Server

```bash
cd server
npm install
cp .env.example .env   # completar ANTHROPIC_API_KEY
npm run db:reset       # crea criteria.db y seedea usuarios + cursos + actividades
npm run dev            # http://localhost:3001
```

El frontend proxya `/api` a `localhost:3001`.

## Auth demo

Todas las rutas (excepto `/api/health`) requieren header `x-user-id`. El FE lo
guarda en `localStorage` y tiene un selector en la UI para alternar entre los
usuarios del seed:

- Docentes: `yairp`, `rosariom`
- Alumnos: `sofiam`, `mateol`, `valentinag`, `thiagor`, `camilaf`, `benjamind`
