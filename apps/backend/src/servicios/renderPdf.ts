import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Convierte una URL del renderer en un PDF. El backend no sabe —ni quiere
 * saber— con qué se renderiza: en la app empaquetada lo inyecta Electron, que
 * ya trae Chromium y no necesita ninguna dependencia nueva; en desarrollo lo
 * inyecta `server.ts` con el Chromium que haya en el sistema.
 *
 * Es una función y no una clase porque no hay estado que guardar entre
 * llamadas, y así la implementación de Electron es un cierre sobre
 * `BrowserWindow` sin que el backend importe nada de Electron.
 */
export type RenderizadorPdf = (url: string) => Promise<Buffer>;

/**
 * Candidatos de Chromium para desarrollo, en orden de preferencia. Todos
 * aceptan los mismos flags porque todos son Chromium; la lista existe porque
 * cada distribución empaqueta el binario con un nombre distinto.
 */
const BINARIOS_CHROMIUM = [
  'chromium',
  'chromium-browser',
  'google-chrome-stable',
  'google-chrome',
  'brave',
  'brave-browser',
  'microsoft-edge',
];

/** Margen para que la página cargue, pida sus datos a la API y pinte. */
const PRESUPUESTO_TIEMPO_MS = 20_000;

async function buscarChromium(): Promise<string | null> {
  if (process.env.CHROMIUM_BIN) return process.env.CHROMIUM_BIN;

  for (const binario of BINARIOS_CHROMIUM) {
    // Se invoca el propio binario en vez de `command -v`: así no hace falta
    // un shell (cuyo `shell: true` concatena argumentos sin escapar) y de
    // paso se comprueba que además de existir, arranca.
    const encontrado = await new Promise<boolean>((resolver) => {
      const p = spawn(binario, ['--version'], { stdio: 'ignore' });
      p.on('close', (codigo) => resolver(codigo === 0));
      p.on('error', () => resolver(false));
    });
    if (encontrado) return binario;
  }
  return null;
}

/**
 * Renderizador de desarrollo: invoca el Chromium del sistema en modo headless.
 *
 * Es deliberadamente un `spawn` y no Puppeteer/Playwright: esas librerías
 * descargan su propio Chromium (cientos de MB) y aquí sobran por completo,
 * porque en producción el renderizado lo hace el Chromium de Electron. Este
 * camino sólo existe para que `bun run dev:backend` + `dev:renderer` puedan
 * descargar el PDF sin tener que empaquetar la app.
 *
 * `--virtual-time-budget` es lo que hace que headless espere: adelanta el
 * reloj virtual hasta que la página termina de cargar y de resolver sus
 * peticiones, en vez de imprimir un documento a medio pintar.
 */
export function crearRenderizadorChromium(): RenderizadorPdf {
  return async (url) => {
    const binario = await buscarChromium();
    if (!binario) {
      throw new Error(
        'No se encontró ningún Chromium para generar el PDF en desarrollo. ' +
          `Instala uno de: ${BINARIOS_CHROMIUM.join(', ')}, o define CHROMIUM_BIN con la ruta. ` +
          'En la app empaquetada esto no aplica: ahí el PDF lo genera el Chromium de Electron.'
      );
    }

    const dir = mkdtempSync(join(tmpdir(), 'cotizador-pdf-'));
    const salida = join(dir, 'documento.pdf');

    try {
      await new Promise<void>((resolver, rechazar) => {
        const proceso = spawn(
          binario,
          [
            '--headless',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            // El tamaño y los márgenes los decide el `@page` del documento.
            '--no-pdf-header-footer',
            // El par documentado para que headless imprima una página ya
            // estabilizada: el reloj virtual sólo avanza cuando la página
            // está inactiva (así espera a los fetch a la API), y el segundo
            // flag obliga a completar el compositor antes de dibujar.
            `--virtual-time-budget=${PRESUPUESTO_TIEMPO_MS}`,
            '--run-all-compositor-stages-before-draw',
            `--print-to-pdf=${salida}`,
            url,
          ],
          { stdio: ['ignore', 'ignore', 'pipe'] }
        );

        let stderr = '';
        proceso.stderr?.on('data', (trozo) => {
          stderr += String(trozo);
        });

        proceso.on('error', rechazar);
        proceso.on('close', (codigo) => {
          if (codigo === 0) resolver();
          else rechazar(new Error(`${binario} falló al generar el PDF (código ${codigo}): ${stderr.trim()}`));
        });
      });

      return readFileSync(salida);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
