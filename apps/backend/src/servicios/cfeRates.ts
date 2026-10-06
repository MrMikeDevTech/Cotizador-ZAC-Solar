import type { PrismaClient } from '../generated/prisma/client.ts';
import { scrapeTariffs, scrapeDac } from '@cotizador/cfe-scraper';
import type { CfeClient, ScrapeOptions, DacScrapeResult } from '@cotizador/cfe-scraper';

/** Resumen de una corrida de sincronización. */
export interface SyncCfeRatesResult {
  /** Total de escalones insertados o actualizados. */
  saved: number;
  /** Periodos consultados que CFE todavía no publica. */
  missing: number;
  /** Sondeos que fallaron tras agotar reintentos. */
  errors: number;
  /** Cuotas de DAC (una por región) insertadas o actualizadas. */
  dacSaved: number;
  durationMs: number;
}

/**
 * Consulta las tarifas CFE (vía `@cotizador/cfe-scraper`) y persiste cada
 * escalón en `cfeTariffRate`. Idempotente: un escalón ya existente (misma
 * combinación tarifa/año/mes/temporada/índice) se actualiza en lugar de
 * duplicarse.
 */
export async function syncCfeRates(
  prisma: PrismaClient,
  options?: ScrapeOptions,
  client?: CfeClient,
  /**
   * Resultado de DAC ya calculado. Solo lo usan los tests, para ejercitar la
   * persistencia sin salir a la red (DAC no pasa por `CfeClient`: su página
   * necesita dos postbacks encadenados y tiene su propio cliente).
   */
  resultadoDac?: DacScrapeResult,
): Promise<SyncCfeRatesResult> {
  const resultado = client ? await scrapeTariffs(options, client) : await scrapeTariffs(options);

  let saved = 0;

  for (const quote of resultado.quotes) {
    for (const tier of quote.tiers) {
      await prisma.cfeTariffRate.upsert({
        where: {
          tariffCode_year_month_season_tierIndex: {
            tariffCode: quote.tariffCode,
            year: quote.year,
            month: quote.month,
            season: quote.season,
            tierIndex: tier.tierIndex,
          },
        },
        create: {
          tariffCode: quote.tariffCode,
          year: quote.year,
          month: quote.month,
          season: quote.season,
          tierIndex: tier.tierIndex,
          concept: tier.concept,
          price: tier.price,
          description: tier.description,
          limitKwh: tier.limitKwh,
          fetchedAt: quote.fetchedAt,
        },
        update: {
          concept: tier.concept,
          price: tier.price,
          description: tier.description,
          limitKwh: tier.limitKwh,
          fetchedAt: quote.fetchedAt,
        },
      });
      saved++;
    }
  }

  // DAC va por separado porque CFE la publica con otra forma: no tiene escalones
  // de consumo sino una cuota por región (cargo fijo + precio plano por kWh).
  // Vive en su propia tabla, así que se sincroniza aparte.
  //
  // Si se inyectó un `client` (señal inequívoca de que estamos en un test) y no
  // se pasó un resultado de DAC, se omite: DAC tiene su propio cliente HTTP y
  // llamarlo aquí haría que los tests salieran a la red.
  const omitirDac = client !== undefined && resultadoDac === undefined;
  const dacSaved = omitirDac ? 0 : await sincronizarDac(prisma, options, resultadoDac);

  return {
    saved,
    missing: resultado.missing.length,
    errors: resultado.errors.length,
    dacSaved,
    durationMs: resultado.durationMs,
  };
}

/**
 * Persiste las cuotas de DAC. Acepta un resultado ya calculado para poder
 * probarlo sin red; si no se le pasa ninguno, consulta a CFE.
 *
 * Un fallo aquí no tumba la sincronización de las tarifas escalonadas, que es
 * el dato principal: se registra y se devuelve 0.
 */
async function sincronizarDac(
  prisma: PrismaClient,
  options?: ScrapeOptions,
  resultadoPrevio?: DacScrapeResult
): Promise<number> {
  let resultado: DacScrapeResult;
  try {
    resultado =
      resultadoPrevio ??
      (await scrapeDac({
        year: options?.year,
        month: options?.months?.[0],
        requestDelayMs: options?.requestDelayMs,
      }));
  } catch (error) {
    console.warn(
      'No se pudieron obtener las cuotas de DAC:',
      error instanceof Error ? error.message : error
    );
    return 0;
  }

  let guardadas = 0;
  for (const rate of resultado.rates) {
    await prisma.cfeDacRate.upsert({
      where: {
        year_month_region: { year: resultado.year, month: resultado.month, region: rate.region },
      },
      create: {
        year: resultado.year,
        month: resultado.month,
        region: rate.region,
        cargoFijo: rate.cargoFijo,
        precioKwh: rate.precioKwh,
        precioKwhVerano: rate.precioKwhVerano,
        fetchedAt: resultado.fetchedAt,
      },
      update: {
        cargoFijo: rate.cargoFijo,
        precioKwh: rate.precioKwh,
        precioKwhVerano: rate.precioKwhVerano,
        fetchedAt: resultado.fetchedAt,
      },
    });
    guardadas++;
  }
  return guardadas;
}
