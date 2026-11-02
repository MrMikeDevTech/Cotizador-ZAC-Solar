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

// 7. OCR de recibos CFE (tesseract.js + PDFium en WebAssembly). Es JS/WASM, sin
//    binarios nativos, pero tiene tres exigencias que fallan en silencio en el
//    equipo de desarrollo y solo se notan en la app instalada: el worker y los
//    .wasm deben quedar desempaquetados del asar, el idioma debe viajar como
//    recurso, y las dependencias del worker deben desempaquetarse con él.
for (const modulo of ['@hyzyla/pdfium', 'tesseract.js', 'tesseract.js-core', 'unpdf', 'pngjs']) {
  try {
    require.resolve(modulo);
  } catch {
    problemas.push(`La dependencia del OCR "${modulo}" no se resuelve.\n  Arréglalo con: bun install`);
  }
}

exigirArchivo(
  join(raizDesktop, '..', 'backend', 'assets', 'tessdata', 'spa.traineddata'),
  'El idioma del OCR (spa.traineddata)',
  'restaurarlo desde apps/backend/assets/tessdata (ver LEEME.md)'
);

const rutaYml = join(raizDesktop, 'electron-builder.yml');
const yml = existsSync(rutaYml) ? readFileSync(rutaYml, 'utf-8') : '';
if (!/to:\s*tessdata/.test(yml)) {
  problemas.push(
    'electron-builder.yml no copia los datos de idioma del OCR.\n' +
      '  Falta en extraResources: from ../backend/assets/tessdata, to tessdata.'
  );
}

// Cadena de dependencias de tesseract.js: cada una debe estar en asarUnpack, o el
// worker (que corre desde app.asar.unpacked) no las encontrará al hacer require.
const raizModulos = join(raizDesktop, '..', '..', 'node_modules');
const IGNORAR = new Set(['opencollective-postinstall']); // solo un script de instalación
const cadena = new Set(['@hyzyla/pdfium']);
(function recorrer(nombre) {
  if (cadena.has(nombre) || IGNORAR.has(nombre)) return;
  cadena.add(nombre);
  const rutaPaquete = join(raizModulos, nombre, 'package.json');
  if (!existsSync(rutaPaquete)) return;
  const dependencias = JSON.parse(readFileSync(rutaPaquete, 'utf-8')).dependencies ?? {};
  for (const dependencia of Object.keys(dependencias)) recorrer(dependencia);
})('tesseract.js');

const sinDesempaquetar = [...cadena].filter((nombre) => !yml.includes(`node_modules/${nombre}/**/*`));
if (sinDesempaquetar.length > 0) {
  problemas.push(
    'asarUnpack de electron-builder.yml no cubre toda la cadena del OCR. Faltan:\n' +
      sinDesempaquetar.map((nombre) => `      - node_modules/${nombre}/**/*`).join('\n')
  );
}

// El bundle debe dejarlos como externos (importados del node_modules empaquetado) y
// llevar la ruta; si se incrustaran, el worker y el .wasm perderían su ubicación.
if (existsSync(bundlePrincipal)) {
  const bundle = readFileSync(bundlePrincipal, 'utf-8');
  if (!bundle.includes('parsear-recibo-cfe')) {
    problemas.push('El bundle no incluye la ruta parsear-recibo-cfe.\n  Arréglalo con: bun run build:electron');
  }
  for (const externo of ['tesseract.js', '@hyzyla/pdfium']) {
    const importaExterno = bundle.includes(`from "${externo}"`) || bundle.includes(`from '${externo}'`);
    if (!importaExterno) {
      problemas.push(
        `El bundle no importa "${externo}" como externo.\n` +
          '  Revisa los --external de "build:electron" en package.json.'
      );
    }
  }
  if (!bundle.includes('TESSDATA_DIR')) {
    problemas.push('main.ts no fija TESSDATA_DIR: el OCR no encontraría su idioma en la app instalada.');
  }
}

if (problemas.length > 0) {
  console.error(`\n✖ No se puede empaquetar todavía (${problemas.length}):\n`);
  for (const problema of problemas) console.error(`  - ${problema}\n`);
  process.exit(1);
}

console.log('✓ Verificación previa al empaquetado correcta.');
