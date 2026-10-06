/** Superficie pública del paquete `@cotizador/cfe-scraper`. */

export { scrapeTariffs } from './scraper.ts';
export { parseTariffPage } from './parser.ts';
export type { ParsedPage } from './parser.ts';
export { parseDacPage, scrapeDac } from './dac.ts';
export { createCfeClient } from './client.ts';
export { ALL_TARIFF_CODES, TARIFFS, tariffConfig, seasonFor, summerStartProbes } from './config.ts';
export type { TariffConfig } from './config.ts';

export type {
  CfeClient,
  DacRate,
  DacScrapeResult,
  HiddenFields,
  MissingPeriod,
  ScrapeError,
  ScrapeOptions,
  ScrapeResult,
  Season,
  TariffCode,
  TariffQuote,
  TariffTier,
} from './types.ts';
