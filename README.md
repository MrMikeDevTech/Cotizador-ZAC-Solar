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
  cfe-scraper/        # obtiene las tarifas domésticas de CFE (app.cfe.mx)
tsconfig.base.json
```

## Requisitos

- [Bun](https://bun.sh) — gestor de paquetes y runtime del monorepo.
- **Windows únicamente, solo para `bun run dist`**: Visual Studio Build Tools con el
  workload **"Desktop development with C++"**. `bun run dist` recompila
  `better-sqlite3` (módulo nativo) contra el ABI de Electron vía `node-gyp`, que
  necesita el compilador MSVC. Sin esto falla con
  `Could not find any Visual Studio installation to use`. `bun run dev:backend` y
  `bun run start` no lo necesitan (usan el binario ya compilado para Node/Bun).

  Instalación rápida con winget:
  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools --exact --silent `
    --accept-package-agreements --accept-source-agreements `
    --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```
  O manualmente desde el
  [instalador de Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022),
  marcando el workload "Desktop development with C++".

- **NixOS**: el CLI de Prisma no encuentra su `schema-engine` (intenta descargar un
  binario para el target `linux-nixos`, que no existe), así que `prisma generate` y
  `prisma migrate` fallan y el `postinstall` avisa sin romper la instalación. La
  solución es usar el binario estático, que no depende de FHS:

  ```bash
  curl -sL "https://binaries.prisma.sh/all_commits/$(bunx prisma --version \
    | grep -oP 'engine=\K[0-9a-f]+')/linux-static-x64/schema-engine.gz" \
    | gunzip > /tmp/prisma-schema-engine && chmod +x /tmp/prisma-schema-engine
  export PRISMA_SCHEMA_ENGINE_BINARY=/tmp/prisma-schema-engine
  bun run --filter @cotizador/backend db:generate
  ```

  Solo afecta al desarrollo: en tiempo de ejecución el backend usa el driver adapter
  de `better-sqlite3` y no necesita ningún engine de Prisma.

## Primer arranque

```bash
bun install
```

`bun install` genera automáticamente el Prisma Client (`postinstall` → `db:generate`).
No hace falta crear un `.env`: `apps/backend/prisma.config.ts` usa `file:./dev.db`
como valor por defecto si `DATABASE_URL` no está definida. Solo copia
`apps/backend/.env.example` a `.env` si quieres apuntar el dev a otra ruta/archivo.

Las migraciones y el seed de catálogos (paneles, inversores, estructuras, tarifas,
factores de cálculo) corren automáticamente al iniciar el backend — no hace falta
ningún paso manual de base de datos.

En la app empaquetada (Electron) el `.db` no usa `DATABASE_URL` ni el `dev.db` local:
`apps/desktop/electron/main.ts` fija la ruta en tiempo de ejecución con
`app.getPath("userData")` (p. ej. `%APPDATA%\Cotizador\cotizador.db` en Windows),
fuera de la carpeta de instalación — así el instalador/desinstalador nunca la toca.

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
  de Electron (`npmRebuild`), lo que requiere Visual Studio Build Tools instalado
  (ver [Requisitos](#requisitos)). Tras empaquetar, hay que volver a correr
  `bun install` antes de continuar en modo desarrollo, porque el binario
  recompilado para Electron no sirve para `bun run dev:backend`.
- El resto del backend (rutas, cálculos, Prisma Client generado) se compila con
  `bun build` en un único `electron/dist/main.js` — no requiere Node/TS en el
  equipo del cliente final.
- Los tres externos del bundle (`better-sqlite3`, `@prisma/client` y
  `@prisma/adapter-better-sqlite3`) están declarados como dependencias de
  `apps/desktop/package.json`. Con eso basta: electron-builder resuelve el árbol
  de producción y los copia, incluso estando izados en el `node_modules` de la
  raíz del monorepo por Bun. **No** hay que añadirlos a `files` en
  `electron-builder.yml` con patrones `node_modules/...`: esas rutas no existen
  dentro de `apps/desktop` y el patrón no apuntaría a nada.
- El certificado intermedio de la cadena TLS de CFE va embebido como constante
  en `packages/cfe-scraper/src/certificado.ts`, no como archivo. Tras `bun build`
  el bundle no tiene junto a sí ninguna carpeta `certs/`, así que leerlo del
  disco fallaba con ENOENT en la app instalada. Caduca en diciembre de 2027; las
  instrucciones para rotarlo están en el comentario de ese archivo.
