import type {
  CfeClient,
  MissingPeriod,
  ScrapeError,
  ScrapeOptions,
  ScrapeResult,
  Season,
  TariffCode,
  TariffQuote,
} from './types.ts';
import { ALL_TARIFF_CODES, tariffConfig, summerStartProbes } from './config.ts';
import { createCfeClient } from './client.ts';
import { parseTariffPage } from './parser.ts';

/** Reintentos ante error del cliente, con backoff exponencial (500ms, 1000ms, 2000ms). */
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resta un mes: envuelve de enero a diciembre del año anterior. */
function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Una consulta puntual: tarifa + mes + (opcionalmente) sondeo de inicio de verano. */
interface Probe {
  tariffCode: TariffCode;
  year: number;
  month: number;
  summerStartMonth?: number;
}

/** Construye la matriz de sondeos a realizar para las tarifas/meses dados. */
function buildProbes(tariffs: TariffCode[], year: number, months: number[]): Probe[] {
  const probes: Probe[] = [];

  for (const tariffCode of tariffs) {
    const config = tariffConfig(tariffCode);

    for (const month of months) {
      if (!config.hasSummerSeason) {
        probes.push({ tariffCode, year, month });
        continue;
      }

      for (const summerStartMonth of summerStartProbes(month)) {
        probes.push({ tariffCode, year, month, summerStartMonth });
      }
    }
  }

  return probes;
}

/** Ejecuta `loadPage` + `submitPeriod` para un sondeo, con reintentos y backoff exponencial. */
async function runProbeWithRetry(client: CfeClient, probe: Probe, signal?: AbortSignal): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new Error('Operación abortada');

    try {
      const { hidden } = await client.loadPage(probe.tariffCode);
      return await client.submitPeriod({
        tariffCode: probe.tariffCode,
        hidden,
        year: probe.year,
        month: probe.month,
        summerStartMonth: probe.summerStartMonth,
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

/** Corre la matriz completa de sondeos sobre un conjunto de tarifas/meses dado. */
async function runProbes(
  client: CfeClient,
  probes: Probe[],
  requestDelayMs: number,
  signal: AbortSignal | undefined,
): Promise<{ quotes: TariffQuote[]; missing: MissingPeriod[]; errors: ScrapeError[] }> {
  const quotes: TariffQuote[] = [];
  const missing: MissingPeriod[] = [];
  const errors: ScrapeError[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < probes.length; i++) {
    if (signal?.aborted) break;

    const probe = probes[i];
    if (!probe) continue;

    if (i > 0) {
      await sleep(requestDelayMs);
    }

    if (signal?.aborted) break;

    try {
      const html = await runProbeWithRetry(client, probe, signal);
      const parsed = parseTariffPage(html);

      if (parsed === null) {
        missing.push({
          tariffCode: probe.tariffCode,
          year: probe.year,
          month: probe.month,
          reason: 'not_published',
        });
        continue;
      }

      const dedupeKey = `${probe.tariffCode}|${probe.year}|${probe.month}|${parsed.season}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      quotes.push({
        tariffCode: probe.tariffCode,
        year: probe.year,
        month: probe.month,
        season: parsed.season as Season,
        tiers: parsed.tiers,
        fetchedAt: new Date(),
      });
    } catch (error) {
      errors.push({
        tariffCode: probe.tariffCode,
        year: probe.year,
        month: probe.month,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { quotes, missing, errors };
}

/**
 * Orquesta la consulta de tarifas CFE para las tarifas/meses/año indicados.
 * Sin argumentos, consulta las 7 tarifas para el mes y año en curso.
 */
export async function scrapeTariffs(
  options?: ScrapeOptions,
  client: CfeClient = createCfeClient(),
): Promise<ScrapeResult> {
  const start = Date.now();

  const now = new Date();
  const tariffs = options?.tariffs ?? ALL_TARIFF_CODES;
  const year = options?.year ?? now.getFullYear();
  const monthsWereSpecified = options?.months !== undefined;
  const months = options?.months ?? [now.getMonth() + 1];
  const requestDelayMs = options?.requestDelayMs ?? 300;
  const fallbackToPreviousMonth = options?.fallbackToPreviousMonth ?? true;
  const signal = options?.signal;

  const probes = buildProbes(tariffs, year, months);
  const result = await runProbes(client, probes, requestDelayMs, signal);

  const shouldFallback =
    !monthsWereSpecified &&
    fallbackToPreviousMonth &&
    result.quotes.length === 0 &&
    !signal?.aborted;

  if (shouldFallback) {
    const firstMonth = months[0];
    if (firstMonth !== undefined) {
      const fallback = previousMonth(year, firstMonth);
      const fallbackProbes = buildProbes(tariffs, fallback.year, [fallback.month]);
      const fallbackResult = await runProbes(client, fallbackProbes, requestDelayMs, signal);

      return {
        quotes: fallbackResult.quotes,
        missing: fallbackResult.missing,
        errors: fallbackResult.errors,
        durationMs: Date.now() - start,
      };
    }
  }

  return {
    quotes: result.quotes,
    missing: result.missing,
    errors: result.errors,
    durationMs: Date.now() - start,
  };
}
