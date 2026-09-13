# Cotizador Solar — Monorepo

App de escritorio **offline-first** para cotizar venta e instalación de paneles
solares en campo. Todo corre en local: Electron embebe un backend Hono con
Prisma/SQLite, sin necesidad de internet ni de un servidor externo.

## Estructura

```
apps/
  desktop/            # Electron
    electron/         # proceso principal (main.ts, preload.ts, db/)
    renderer/         # Next.js (static export → renderer/out)
    electron-builder.yml
  backend/            # API REST local (Hono + Prisma/SQLite)
packages/
  shared/             # tipos, schemas Zod, cálculos y catálogos por defecto compartidos
tsconfig.base.json
```

## Primer arranque

```bash
bun install
cp apps/backend/.env.example apps/backend/.env   # DATABASE_URL="file:./dev.db"
```

Las migraciones y el seed de catálogos (paneles, inversores, estructuras, tarifas,
factores de cálculo) corren automáticamente al iniciar el backend — no hace falta
ningún paso manual de base de datos.

## Comandos (Bun)

```bash
bun install                # instala todo el monorepo desde la raíz
bun run test               # tests de packages/shared (bun) + apps/backend (node)

bun run dev:backend        # API local en http://127.0.0.1:3001 (Hono + Prisma/SQLite)
bun run dev:renderer       # next dev en http://localhost:3000

bun run build:renderer     # export estático → apps/desktop/renderer/out
bun run start              # compila electron/ y lanza `electron .` (requiere out/ generado)
bun run dist               # empaqueta instalador (electron-builder)
```

## Dev con Electron + Next con HMR

1. `bun run dev:backend` (API en <http://127.0.0.1:3001>)
2. `bun run dev:renderer` (Next en <http://localhost:3000>)
3. En otra terminal: `ELECTRON_RENDERER_URL="http://localhost:3000" bun run start`

## Notas de empaquetado

- `better-sqlite3` es un módulo nativo: `bun run dist` lo recompila contra el ABI
  de Electron (`npmRebuild`). Tras empaquetar, hay que volver a correr `bun install`
  antes de continuar en modo desarrollo, porque el binario recompilado para
  Electron no sirve para `bun run dev:backend`.
- El resto del backend (rutas, cálculos, Prisma Client generado) se compila con
  `bun build` en un único `electron/dist/main.js` — no requiere Node/TS en el
  equipo del cliente final.
