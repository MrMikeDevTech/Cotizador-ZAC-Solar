# Cotizador Solar — Monorepo

App de escritorio **offline-first** para cotizar venta e instalación de paneles
solares en campo. Ver `PROJECT_PLAN.md` para arquitectura y fases.

## Estructura

```
apps/
  desktop/            # Electron
    electron/         # proceso principal (main.ts, preload.ts, db/)
    renderer/         # Next.js (static export → renderer/out)
    electron-builder.yml
  backend/            # API REST + PostgreSQL (Fase 4)
packages/
  shared/             # tipos/schemas compartidos
tsconfig.base.json
```

## Comandos (Bun)

```bash
bun install              # instala todo el monorepo desde la raíz

bun run dev:renderer     # next dev (con ELECTRON_RENDERER_URL)
bun run build:renderer   # export estático → apps/desktop/renderer/out
bun run start            # electron . (requiere out/ generado)
bun run dist             # empaqueta instalador (electron-builder)
bun run dev:backend      # backend placeholder
```

## Dev con Electron + Next con HMR

1. `bun run dev:renderer` (Next en <http://localhost:3000>)
2. En otra terminal: `$env:ELECTRON_RENDERER_URL="http://localhost:3000"; bun run start`