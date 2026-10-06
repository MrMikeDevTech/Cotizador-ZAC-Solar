/** Códigos de tarifa doméstica cubiertos por este scraper (DAC queda fuera). */
export type TariffCode = '1' | '1A' | '1B' | '1C' | '1D' | '1E' | '1F';

/**
 * CFE publica dos juegos de cuotas. `non_summer` es lo que el sitio llama
 * "temporada fuera de verano". Tarifa 1 solo tiene `non_summer`.
 */
export type Season = 'summer' | 'non_summer';

/** Un escalón de consumo dentro de una tarifa. Las tarifas 1/1A/1B tienen 3; 1C–1F tienen 4. */
export interface TariffTier {
  /** Posición del escalón, 0 = el primero (básico). */
  tierIndex: number;
  /** Etiqueta tal cual la publica CFE: 'Consumo básico', 'Consumo intermedio bajo'… */
  concept: string;
  /** Precio en pesos por kWh. */
  price: number;
  /** Texto original e íntegro de la tercera columna. Es la fuente de verdad. */
  description: string;
  /**
   * Límite en kWh extraído de `description`.
   * `null` cuando no aplica (escalón excedente) o cuando no se pudo extraer con
   * confianza — en ese caso `description` conserva el dato original.
   */
  limitKwh: number | null;
}

/** Cuotas de una tarifa para un mes y temporada concretos. */
export interface TariffQuote {
  tariffCode: TariffCode;
  year: number;
  /** 1-12 */
  month: number;
  season: Season;
  tiers: TariffTier[];
  fetchedAt: Date;
}

/** Una combinación consultada que no devolvió datos (p. ej. mes aún no publicado). */
export interface MissingPeriod {
  tariffCode: TariffCode;
  year: number;
  month: number;
  reason: 'not_published' | 'unreachable_season';
}

/** Un fallo real (red, 5xx, HTML inesperado) tras agotar los reintentos. */
export interface ScrapeError {
  tariffCode: TariffCode;
  year: number;
  month: number;
  message: string;
}

export interface ScrapeResult {
  quotes: TariffQuote[];
  missing: MissingPeriod[];
  errors: ScrapeError[];
  durationMs: number;
}

export interface ScrapeOptions {
  /** Default: las 7 tarifas. */
  tariffs?: TariffCode[];
  /** Default: año en curso. */
  year?: number;
  /** Default: `[mes en curso]`. Valores 1-12. */
  months?: number[];
  /** Pausa entre requests, en ms. Default: 300. */
  requestDelayMs?: number;
  /**
   * Si el periodo por defecto (mes en curso) no devuelve nada, reintenta con el
   * mes anterior. Solo aplica cuando `months` no fue especificado. Default: true.
   */
  fallbackToPreviousMonth?: boolean;
  signal?: AbortSignal;
}

/** Cuota de DAC para una región. DAC se publica por región, no por escalones. */
export interface DacRate {
  region: string;
  /** Cargo fijo mensual, en pesos. */
  cargoFijo: number;
  /** Precio por kWh. En regiones sin temporada diferenciada es el único. */
  precioKwh: number;
  /** Precio de verano, solo donde CFE lo distingue (Baja California y BCS). */
  precioKwhVerano: number | null;
}

export interface DacScrapeResult {
  year: number;
  month: number;
  rates: DacRate[];
  fetchedAt: Date;
}

/** Campos ocultos de ASP.NET (`__VIEWSTATE`, `__EVENTVALIDATION`, `hdAnio`…) tal cual vienen. */
export type HiddenFields = Record<string, string>;

/**
 * Capa HTTP. Se declara como interfaz para poder sustituirla por un doble en los
 * tests del scraper sin tocar la red.
 */
export interface CfeClient {
  /** GET de la página: devuelve el HTML y sus campos ocultos. */
  loadPage(tariffCode: TariffCode): Promise<{ html: string; hidden: HiddenFields }>;
  /** POST con el periodo seleccionado: devuelve el HTML con las cuotas. */
  submitPeriod(input: {
    tariffCode: TariffCode;
    hidden: HiddenFields;
    year: number;
    month: number;
    /** Mes de inicio de verano (2-5). Se ignora en Tarifa 1, que no tiene el campo. */
    summerStartMonth?: number;
  }): Promise<string>;
}
