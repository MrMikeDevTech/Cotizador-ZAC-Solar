/**
 * Comprobación previa a `electron-builder`.
 *
 * Los fallos que arruinan la app instalada son silenciosos en el equipo de
 * desarrollo: el frontend sin exportar, el bundle sin el scraper o sin el
 * certificado de CFE, las migraciones ausentes. Todos se manifiestan sólo
 * cuando el cliente ya tiene el instalador, y entonces aparecen como una
 * ventana en blanco o una app que no cotiza. Verificarlo aquí cuesta
 * milisegundos y convierte cada uno en un mensaje claro antes de empaquetar.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizDesktop = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const problemas = [];

function exigirArchivo(ruta, queEs, comoArreglar) {
  if (!existsSync(ruta) || !statSync(ruta).isFile()) {
    problemas.push(`${queEs} no existe:\n    ${ruta}\n  Arréglalo con: ${comoArreglar}`);
    return false;
  }
  return true;
}

// 1. Export estático del frontend. Sin esto la ventana arranca y muestra el
//    cuadro de error "falta el frontend".
const salidaRenderer = join(raizDesktop, 'renderer', 'out');
exigirArchivo(join(salidaRenderer, 'index.html'), 'El export del frontend', 'bun run build:renderer');
exigirArchivo(
  join(salidaRenderer, 'login', 'index.html'),
  'La pantalla de inicio de sesión del export',
  'bun run build:renderer'
);

// 2. Bundle del proceso principal, con las piezas que no se ven a simple vista.
const bundlePrincipal = join(raizDesktop, 'electron', 'dist', 'main.js');
if (exigirArchivo(bundlePrincipal, 'El bundle de Electron', 'bun run build:electron')) {
  const contenido = readFileSync(bundlePrincipal, 'utf-8');

  // El scraper viaja dentro del bundle; si `main.ts` deja de llamarlo, la app
  // instalada nunca descarga tarifas y toda cotización queda aproximada.
  if (!contenido.includes('scrapeTariffs')) {
    problemas.push(
      'El bundle no incluye el scraper de CFE.\n' +
        '  Revisa que electron/main.ts siga llamando a syncCfeRates().'
    );
  }

  // El certificado intermedio va embebido como constante (ver
  // packages/cfe-scraper/src/certificado.ts); leerlo del disco fallaba en la
  // app instalada.
  if (!contenido.includes('BEGIN CERTIFICATE')) {
    problemas.push(
      'El bundle no incluye el certificado intermedio de CFE.\n' +
        '  Revisa packages/cfe-scraper/src/certificado.ts.'
    );
  }
}

// 3. Icono de Windows: sin él electron-builder usa el logotipo genérico de
//    Electron para el .exe, el instalador y los accesos directos.
exigirArchivo(
  join(raizDesktop, 'build', 'icon.ico'),
  'El icono de Windows',
  'magick renderer/public/logo.jpeg -resize 256x256^ -gravity center -extent 256x256 ' +
    '-define icon:auto-resize=256,128,64,48,32,16 build/icon.ico'
);

// 4. Migraciones de Prisma: viajan como recurso aparte (extraResources) y son
//    lo que crea la base de datos en el primer arranque del cliente.
const dirMigraciones = join(raizDesktop, '..', 'backend', 'prisma', 'migrations');
if (!existsSync(dirMigraciones)) {
  problemas.push(`La carpeta de migraciones no existe:\n    ${dirMigraciones}`);
} else {
  const conSql = readdirSync(dirMigraciones, { withFileTypes: true }).filter(
    (entrada) => entrada.isDirectory() && existsSync(join(dirMigraciones, entrada.name, 'migration.sql'))
  );
  if (conSql.length === 0) {
    problemas.push(
      `No hay ninguna migración con migration.sql en:\n    ${dirMigraciones}\n` +
        '  Sin migraciones la app instalada no puede crear su base de datos.'
    );
  }
}

// 5. Los tres externos del bundle. Bun los iza al node_modules de la raíz del
//    monorepo; electron-builder los recolecta por estar declarados como
//    dependencias de este paquete.
for (const modulo of ['better-sqlite3', '@prisma/client', '@prisma/adapter-better-sqlite3']) {
  try {
    require.resolve(modulo);
  } catch {
    problemas.push(`La dependencia nativa "${modulo}" no se resuelve.\n  Arréglalo con: bun install`);
  }
}

// 6. Cliente de Prisma generado: el bundle lo importa ya transpilado, así que
//    si falta, `bun run build:electron` habría fallado antes; se comprueba
//    igual porque el mensaje de Prisma es poco claro.
exigirArchivo(
  join(raizDesktop, '..', 'backend', 'src', 'generated', 'prisma', 'client.ts'),
  'El cliente de Prisma generado',
  'bun run --filter @cotizador/backend db:generate'
);

if (problemas.length > 0) {
  console.error(`\n✖ No se puede empaquetar todavía (${problemas.length}):\n`);
  for (const problema of problemas) console.error(`  - ${problema}\n`);
  process.exit(1);
}

console.log('✓ Verificación previa al empaquetado correcta.');
