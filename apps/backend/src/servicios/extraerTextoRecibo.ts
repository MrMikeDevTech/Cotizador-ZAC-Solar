import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFiumLibrary } from '@hyzyla/pdfium';
import { PNG } from 'pngjs';
import { createWorker, type Worker } from 'tesseract.js';
import { extractText, getDocumentProxy } from 'unpdf';
import { analizarReciboCfe, reciboReconocido } from '@cotizador/shared';
import { ErrorApi } from '../errores.ts';

/**
 * Obtiene el texto de un recibo CFE en PDF.
 *
 * 1. **Capa de texto** (`unpdf`): rápida y exacta cuando el PDF viene del
 *    portal de CFE. Se da por buena solo si de ella sale un recibo reconocible
 *    (nº de servicio de 12 dígitos).
 * 2. **OCR** (PDFium en WebAssembly + tesseract.js): para los PDF impresos
 *    desde un celular o una captura, cuya capa de texto está dañada —las
 *    fuentes no llevan un `ToUnicode` utilizable y el texto sale como
 *    `8:29:7#1:8!69`—. Todo es JavaScript/WASM, sin binarios nativos, y los
 *    datos de idioma viajan con la app: funciona sin conexión.
 *
 * ## Por qué el OCR lee recortes y no la página entera
 *
 * Medido con un recibo real: la página completa deja ilegibles los importes
 * de la tabla de consumo (colores de fondo, gráficas y logotipos confunden a
 * Tesseract) y falla en detalles como `1B` → `15B`. Recortando la zona que
 * interesa, ampliándola (escala 5) y pasándola a grises, las 6 filas del
 * histórico salen exactas y el bloque del titular también. La página completa
 * queda como segundo intento, solo si los recortes no bastan.
 */

export type OrigenTexto = 'pdf' | 'ocr';

export interface TextoRecibo {
  /** Una cadena por página (en OCR, la unión de los recortes de esa página). */
  paginas: string[];
  origen: OrigenTexto;
}

/** Zonas del recibo CFE, como fracción del ancho/alto de la página: [x0, y0, x1, y1]. */
const REGIONES_OCR: Array<[number, number, number, number]> = [
  [0, 0.1, 0.47, 0.43], // titular, domicilio, servicio, tarifa, hilos, periodo
  [0.025, 0.045, 0.42, 0.265], // tabla "Consumo histórico"
];

const ESCALA_RENDER = 5;
const MAX_PAGINAS = 4;
const TIEMPO_MAX_RECONOCER_MS = 60_000;
const INACTIVIDAD_WORKER_MS = 60_000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const requerir = createRequire(import.meta.url);

/**
 * Carpeta con `spa.traineddata`. En desarrollo es `apps/backend/assets/tessdata`;
 * en la app empaquetada, `main.ts` la fija en `TESSDATA_DIR` apuntando al recurso
 * `resources/tessdata` (ver `extraResources` en electron-builder.yml).
 */
function carpetaIdiomas(): string {
  return process.env.TESSDATA_DIR ?? join(__dirname, '..', '..', 'assets', 'tessdata');
}

/**
 * Dentro del instalador, el código vive en `app.asar` (un archivo, no una
 * carpeta). Un worker de `worker_threads` o un `.wasm` deben leerse como
 * archivos reales, y electron-builder los deja en `app.asar.unpacked` (ver
 * `asarUnpack`). En desarrollo la ruta no pasa por un asar y se devuelve igual.
 */
function rutaDesempaquetada(ruta: string): string {
  const desempaquetada = ruta.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  return desempaquetada !== ruta && existsSync(desempaquetada) ? desempaquetada : ruta;
}

/** Script del worker de tesseract.js, ya en su ubicación ejecutable. */
function rutaWorkerTesseract(): string {
  // `main` de tesseract.js es `src/index.js`; el worker de Node vive junto a él.
  const raiz = dirname(requerir.resolve('tesseract.js'));
  return rutaDesempaquetada(join(raiz, 'worker-script', 'node', 'index.js'));
}

// ── Capa de texto ────────────────────────────────────────────────────────

async function leerCapaDeTexto(bytes: Uint8Array): Promise<string[] | null> {
  try {
    // pdf.js toma posesión del buffer que recibe: se le da una copia.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  } catch {
    return null;
  }
}

/** La capa de texto sirve si de ella se reconoce un recibo (nº de servicio de 12 dígitos). */
function capaDeTextoLegible(paginas: string[]): boolean {
  return analizarReciboCfe(paginas).datos.numeroServicio.length === 12;
}

// ── Tesseract: un solo worker, reutilizado y liberado por inactividad ───────

let workerPromesa: Promise<Worker> | null = null;
let temporizadorInactividad: ReturnType<typeof setTimeout> | null = null;
/** Cola: Tesseract procesa de uno en uno; las peticiones concurrentes esperan turno. */
let cola: Promise<unknown> = Promise.resolve();

async function obtenerWorker(): Promise<Worker> {
  workerPromesa ??= (async () => {
    const worker = await createWorker('spa', 1, {
      langPath: carpetaIdiomas(),
      workerPath: rutaWorkerTesseract(),
      gzip: false,
      // Sin caché en disco: el modelo ya está en `langPath`.
      cacheMethod: 'none',
    });
    await worker.setParameters({
      tessedit_pageseg_mode: '6' as never,
      preserve_interword_spaces: '1',
    });
    return worker;
  })();

  try {
    return await workerPromesa;
  } catch (error) {
    workerPromesa = null; // que el próximo intento vuelva a probar
    throw error;
  }
}

function programarCierre(): void {
  if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
  temporizadorInactividad = setTimeout(() => {
    void cerrarOcr();
  }, INACTIVIDAD_WORKER_MS);
  temporizadorInactividad.unref();
}

/** Libera el worker de Tesseract (memoria). Se llama solo por inactividad o en los tests. */
export async function cerrarOcr(): Promise<void> {
  if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
  temporizadorInactividad = null;
  const pendiente = workerPromesa;
  workerPromesa = null;
  if (pendiente) await (await pendiente.catch(() => null))?.terminate();
}

function reconocer(imagen: Buffer): Promise<string> {
  const turno = cola.then(async () => {
    const worker = await obtenerWorker();
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      const limite = new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(
          () => rechazar(new Error('Tesseract superó el tiempo máximo')),
          TIEMPO_MAX_RECONOCER_MS
        );
      });
      const { data } = await Promise.race([worker.recognize(imagen), limite]);
      return data.text;
    } catch (error) {
      // Un worker atascado no se reutiliza.
      await cerrarOcr();
      throw error;
    } finally {
      if (temporizador) clearTimeout(temporizador);
      programarCierre();
    }
  });
  cola = turno.catch(() => undefined);
  return turno;
}

// ── PDFium (WASM): PDF → bitmap ──────────────────────────────────────────

let pdfiumPromesa: Promise<PDFiumLibrary> | null = null;

function obtenerPdfium(): Promise<PDFiumLibrary> {
  pdfiumPromesa ??= (async () => {
    // El .wasm se lee del disco real (no del asar) y se entrega a PDFium en vez
    // de dejar que lo busque por su cuenta: así no depende de dónde acabe el módulo.
    const rutaWasm = rutaDesempaquetada(join(dirname(requerir.resolve('@hyzyla/pdfium')), 'pdfium.wasm'));
    return PDFiumLibrary.init({ wasmBinary: await readFile(rutaWasm) });
  })().catch((error) => {
    pdfiumPromesa = null;
    throw error;
  });
  return pdfiumPromesa;
}

interface Bitmap {
  /** BGRA, 4 bytes por píxel. */
  data: Uint8Array;
  width: number;
  height: number;
}

/** Recorta una zona (en fracciones de la página), la pasa a grises y la codifica como PNG. */
function recortarAGrises(bitmap: Bitmap, [fx0, fy0, fx1, fy1]: [number, number, number, number]): Buffer {
  const x0 = Math.round(bitmap.width * fx0);
  const y0 = Math.round(bitmap.height * fy0);
  const ancho = Math.round(bitmap.width * fx1) - x0;
  const alto = Math.round(bitmap.height * fy1) - y0;

  const png = new PNG({ width: ancho, height: alto });
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const origen = ((y + y0) * bitmap.width + (x + x0)) * 4;
      const destino = (y * ancho + x) * 4;
      // PDFium entrega BGRA.
      const gris =
        0.299 * bitmap.data[origen + 2]! + 0.587 * bitmap.data[origen + 1]! + 0.114 * bitmap.data[origen]!;
      png.data[destino] = png.data[destino + 1] = png.data[destino + 2] = gris;
      png.data[destino + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

async function leerConOcr(bytes: Uint8Array): Promise<string[]> {
  const biblioteca = await obtenerPdfium();
  const documento = await biblioteca.loadDocument(new Uint8Array(bytes));
  const paginas: string[] = [];
  const bitmaps: Bitmap[] = [];

  try {
    for (const pagina of documento.pages()) {
      if (bitmaps.length >= MAX_PAGINAS) break;
      const bitmap = await pagina.render({ scale: ESCALA_RENDER, render: 'bitmap' });
      bitmaps.push(bitmap as Bitmap);

      const textos: string[] = [];
      for (const region of REGIONES_OCR) {
        textos.push(await reconocer(recortarAGrises(bitmap as Bitmap, region)));
      }
      paginas.push(textos.join('\n'));
    }

    // Segundo intento: si los recortes no dieron un recibo completo (otro diseño
    // de recibo, otra proporción de página), se lee cada página entera.
    const { datos } = analizarReciboCfe(paginas);
    const completo =
      datos.numeroServicio.length === 12 && datos.tarifa !== '' && datos.consumosHistoricos.length > 0;
    if (!completo) {
      for (let i = 0; i < bitmaps.length; i++) {
        paginas[i] += '\n' + (await reconocer(recortarAGrises(bitmaps[i]!, [0, 0, 1, 1])));
      }
    }
  } finally {
    documento.destroy();
  }

  return paginas;
}

// ── Entrada principal ────────────────────────────────────────────────────

/**
 * Texto de un recibo CFE en PDF (capa de texto si es legible; OCR si no).
 * Lanza `RECIBO_ILEGIBLE` (422) si de ninguna forma se obtiene un recibo.
 */
export async function extraerTextoRecibo(bytes: Uint8Array): Promise<TextoRecibo> {
  const capa = await leerCapaDeTexto(bytes);
  if (capa && capaDeTextoLegible(capa)) return { paginas: capa, origen: 'pdf' };

  let paginas: string[];
  try {
    paginas = await leerConOcr(bytes);
  } catch (error) {
    throw new ErrorApi(
      'RECIBO_ILEGIBLE',
      `No se pudo leer el PDF: ${error instanceof Error ? error.message : 'error desconocido'}.`,
      422
    );
  }

  if (!reciboReconocido(analizarReciboCfe(paginas).datos)) {
    throw new ErrorApi(
      'RECIBO_ILEGIBLE',
      'No se pudo leer el texto del recibo. Prueba con el PDF descargado del portal de CFE o con una imagen más nítida.',
      422
    );
  }
  return { paginas, origen: 'ocr' };
}
