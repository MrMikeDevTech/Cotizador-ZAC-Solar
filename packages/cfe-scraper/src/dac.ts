import https from 'node:https';
import tls from 'node:tls';
import { parse } from 'node-html-parser';
import { CERTIFICADO_INTERMEDIO_CFE } from './certificado.ts';
import type { DacRate, DacScrapeResult } from './types.ts';
import { USER_AGENT, YEAR_FIELD } from './config.ts';

const DAC_URL = 'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/TarifaDAC.aspx';

/**
 * Configura un Agent HTTPS con el certificado intermedio de CFE añadido al
 * almacén de confianza, para poder validar la cadena incompleta que sirve
 * app.cfe.mx.
 */
function createHttpsAgent(): https.Agent {
  return new https.Agent({
    ca: [...tls.rootCertificates, CERTIFICADO_INTERMEDIO_CFE],
    keepAlive: true,
  });
}

/**
 * Envuelve https.request en una promesa que acumula los chunks de respuesta
 * y devuelve el body completo.
 */
function httpsRequest(
  url: string,
  options: https.RequestOptions,
  body?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(
          new Error(`HTTP error ${res.statusCode} at ${url}`),
        );
        return;
      }

      res.setEncoding('utf-8');
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', reject);

    if (body) {
      const bodyBuffer = Buffer.from(body, 'utf-8');
      req.setHeader('Content-Length', Buffer.byteLength(bodyBuffer));
      req.write(bodyBuffer);
    }

    req.end();
  });
}

/**
 * Extrae todos los campos ocultos (`<input type="hidden">`) del HTML.
 * Devuelve un registro donde la clave es el atributo `name` y el valor es `value`.
 */
function extractHiddenFields(html: string): Record<string, string> {
  const root = parse(html);
  const hiddenInputs = root.querySelectorAll('input[type=hidden]');
  const fields: Record<string, string> = {};

  for (const input of hiddenInputs) {
    const name = input.getAttribute('name');
    if (!name) continue;

    const value = input.getAttribute('value');
    fields[name] = value ?? '';
  }

  return fields;
}

/**
 * Extrae el valor seleccionado de cada `<select>` del HTML.
 *
 * ASP.NET espera recibir de vuelta el estado completo del formulario, no solo
 * los campos ocultos: omitir los selects hace que el postback de DAC falle.
 * Además, leer sus nombres de aquí permite descubrir cómo se llama el control
 * de mes, que cambia según el año seleccionado.
 */
export function extraerSelects(html: string): Record<string, string> {
  const root = parse(html);
  const campos: Record<string, string> = {};

  for (const select of root.querySelectorAll('select')) {
    const name = select.getAttribute('name');
    if (!name) continue;

    const opciones = select.querySelectorAll('option');
    const seleccionada = opciones.find((o) => o.hasAttribute('selected')) ?? opciones[0];
    campos[name] = seleccionada?.getAttribute('value') ?? '';
  }

  return campos;
}

/**
 * Limpia y convierte un precio (remueve $, espacios y símbolos innecesarios).
 */
function cleanPrice(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[^\d.]/g, '').trim();
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

/**
 * Valida si un texto parece ser el nombre de una región.
 * (debe empezar con letra, no número ni símbolo de divisa)
 */
function looksLikeRegionName(text: string): boolean {
  if (!text || text.length === 0) return false;
  const firstChar = text.charAt(0);
  return /[a-záéíóú]/i.test(firstChar);
}

/**
 * Parseo puro: HTML -> tarifas por región. Sin red, testeable con fixture.
 * Extrae las regiones de las tablas de datos DAC.
 * Devuelve [] si no hay tablas o si están vacías.
 */
export function parseDacPage(html: string): DacRate[] {
  const root = parse(html);
  const rates: DacRate[] = [];

  // Buscar todas las tablas de clase 'table'
  const tables = root.querySelectorAll('table.table');

  for (const table of tables) {
    // Solo procesar tablas hoja (sin otras tablas dentro)
    if (table.querySelectorAll('table').length > 0) continue;

    const rows = table.querySelectorAll('tr');

    for (const row of rows) {
      const cells = row.querySelectorAll('td');

      // Necesitamos al menos 3 celdas (región, cargo fijo, precio...)
      if (cells.length < 3) continue;

      const regionCell = cells[0];
      const cargoCell = cells[1];
      const cell3 = cells[2];
      const cell4 = cells[3];

      if (!regionCell || !cargoCell || !cell3) continue;

      // Normalizar textos
      const regionText = regionCell.text.trim();
      const cargoText = cargoCell.text.trim();
      const cell3Text = cell3.text.trim();

      // Validar que la primera celda sea un nombre de región
      if (!looksLikeRegionName(regionText)) continue;

      const cargoFijo = cleanPrice(cargoText);
      if (cargoFijo === null) continue;

      // 4 celdas: región, cargo fijo, verano, fuera de verano
      if (cell4) {
        const cell4Text = cell4.text.trim();
        const precioVerano = cleanPrice(cell3Text);
        const precioFueraVerano = cleanPrice(cell4Text);

        if (precioVerano !== null && precioFueraVerano !== null) {
          rates.push({
            region: regionText,
            cargoFijo,
            precioKwh: precioFueraVerano,
            precioKwhVerano: precioVerano,
          });
        }
      } else {
        // 3 celdas: región, cargo fijo, precio único
        const precioKwh = cleanPrice(cell3Text);
        if (precioKwh !== null) {
          rates.push({
            region: regionText,
            cargoFijo,
            precioKwh,
            precioKwhVerano: null,
          });
        }
      }
    }
  }

  return rates;
}

/**
 * Obtiene las cuotas DAC de un periodo. Por defecto, mes y año en curso.
 * Reintentos con backoff exponencial. Devuelve rates: [] si no publicado.
 */
export async function scrapeDac(opciones?: {
  year?: number;
  month?: number;
  requestDelayMs?: number;
}): Promise<DacScrapeResult> {
  const MAX_RETRIES = 3;
  const RETRY_BASE_DELAY_MS = 500;

  const sleep = (ms: number): Promise<void> => {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const agent = createHttpsAgent();
  const now = new Date();
  const year = opciones?.year ?? now.getFullYear();
  const month = opciones?.month ?? now.getMonth() + 1;
  const requestDelayMs = opciones?.requestDelayMs ?? 300;

  const httpsOptions = (method: string): https.RequestOptions => ({
    method,
    agent,
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Paso 1: GET inicial
      const initialHtml = await httpsRequest(DAC_URL, { ...httpsOptions('GET'), method: 'GET' });
      const hiddenFields = extractHiddenFields(initialHtml);

      // Paso 2: POST del año
      await sleep(requestDelayMs);
      const yearParams = new URLSearchParams();
      for (const [name, value] of Object.entries(hiddenFields)) {
        yearParams.append(name, value);
      }
      for (const [name, value] of Object.entries(extraerSelects(initialHtml))) {
        yearParams.set(name, value);
      }
      yearParams.set('__EVENTTARGET', YEAR_FIELD);
      yearParams.set('__EVENTARGUMENT', '');
      yearParams.set(YEAR_FIELD, year.toString());

      const yearHtml = await httpsRequest(DAC_URL, httpsOptions('POST'), yearParams.toString());
      const hiddenFields2 = extractHiddenFields(yearHtml);
      const selects2 = extraerSelects(yearHtml);

      // El nombre del control de mes NO es fijo: depende del año elegido. Para
      // 2025 CFE lo renderiza como `MesVerano3$ddMesConsulta` y para 2026 como
      // `Fecha1$ddMes`. Hardcodearlo hace que el postback devuelva un 500, así
      // que se descubre leyendo la respuesta del paso anterior.
      const campoMes = Object.keys(selects2).find((n) => /ddMes/i.test(n));
      if (!campoMes) {
        throw new Error('No se encontró el control de mes en la página de DAC');
      }

      // Paso 3: POST del mes
      await sleep(requestDelayMs);
      const monthParams = new URLSearchParams();
      for (const [name, value] of Object.entries(hiddenFields2)) {
        monthParams.append(name, value);
      }
      for (const [name, value] of Object.entries(selects2)) {
        monthParams.set(name, value);
      }
      monthParams.set('__EVENTTARGET', campoMes);
      monthParams.set('__EVENTARGUMENT', '');
      monthParams.set(YEAR_FIELD, year.toString());
      monthParams.set(campoMes, month.toString());

      const resultHtml = await httpsRequest(DAC_URL, httpsOptions('POST'), monthParams.toString());
      const rates = parseDacPage(resultHtml);

      return {
        year,
        month,
        rates,
        fetchedAt: new Date(),
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  // Si todos los reintentos fallan, lanzar el último error
  throw lastError;
}
