import type { Season, TariffCode } from './types.ts';

export const BASE_URL =
  'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/';

export const USER_AGENT =
  'CotizadorZacSolar/0.1 (+sincronizacion de tarifas publicas CFE)';

/** Campo del año. Idéntico en las 7 páginas. */
export const YEAR_FIELD = 'ctl00$ContentPlaceHolder1$Fecha$ddAnio';

/** Contenedores de resultados. Solo uno de los dos aparece en cada respuesta. */
export const CONTAINER_SUMMER = '#ContentPlaceHolder1_TemporadaV';
export const CONTAINER_NON_SUMMER = '#ContentPlaceHolder1_TemporadaFV';

export interface TariffConfig {
  code: TariffCode;
  /** Nombre de archivo .aspx, sin extensión. */
  page: string;
  /**
   * Tarifa 1 no tiene temporada de verano: una sola consulta por mes y sus
   * cuotas viven siempre en el contenedor "fuera de verano".
   */
  hasSummerSeason: boolean;
  /** Campo del mes a consultar. Ojo: en Tarifa 1 cuelga de `MesVerano1`. */
  monthField: string;
  /** Campo del mes de inicio de verano. Ausente en Tarifa 1. */
  summerStartField?: string;
}

const MONTH_FIELD_WITH_SUMMER = 'ctl00$ContentPlaceHolder1$MesVerano2$ddMesConsulta';
const MONTH_FIELD_NO_SUMMER = 'ctl00$ContentPlaceHolder1$MesVerano1$ddMesConsulta';
const SUMMER_START_FIELD = 'ctl00$ContentPlaceHolder1$MesVerano1$ddMesVerano';

export const TARIFFS: TariffConfig[] = [
  { code: '1', page: 'Tarifa1', hasSummerSeason: false, monthField: MONTH_FIELD_NO_SUMMER },
  { code: '1A', page: 'Tarifa1A', hasSummerSeason: true, monthField: MONTH_FIELD_WITH_SUMMER, summerStartField: SUMMER_START_FIELD },
  { code: '1B', page: 'Tarifa1B', hasSummerSeason: true, monthField: MONTH_FIELD_WITH_SUMMER, summerStartField: SUMMER_START_FIELD },
  { code: '1C', page: 'Tarifa1C', hasSummerSeason: true, monthField: MONTH_FIELD_WITH_SUMMER, summerStartField: SUMMER_START_FIELD },
  { code: '1D', page: 'Tarifa1D', hasSummerSeason: true, monthField: MONTH_FIELD_WITH_SUMMER, summerStartField: SUMMER_START_FIELD },
  { code: '1E', page: 'Tarifa1E', hasSummerSeason: true, monthField: MONTH_FIELD_WITH_SUMMER, summerStartField: SUMMER_START_FIELD },
  { code: '1F', page: 'Tarifa1F', hasSummerSeason: true, monthField: MONTH_FIELD_WITH_SUMMER, summerStartField: SUMMER_START_FIELD },
];

export const ALL_TARIFF_CODES: TariffCode[] = TARIFFS.map((t) => t.code);

export function tariffConfig(code: TariffCode): TariffConfig {
  const found = TARIFFS.find((t) => t.code === code);
  if (!found) throw new Error(`Tarifa desconocida: ${code}`);
  return found;
}

export function pageUrl(code: TariffCode): string {
  return `${BASE_URL}${tariffConfig(code).page}.aspx`;
}

/** Opciones que CFE ofrece como inicio de verano: febrero a mayo. */
export const SUMMER_START_OPTIONS = [2, 3, 4, 5] as const;

/** El verano abarca 6 meses contados desde el mes de inicio. */
export const SUMMER_LENGTH_MONTHS = 6;

/** A qué temporada pertenece `month` si el verano arranca en `summerStart`. */
export function seasonFor(summerStart: number, month: number): Season {
  const end = summerStart + SUMMER_LENGTH_MONTHS - 1; // máx 10, nunca da la vuelta al año
  return month >= summerStart && month <= end ? 'summer' : 'non_summer';
}

/**
 * Inicios de verano mínimos para alcanzar todas las temporadas posibles de un mes.
 *
 * Con inicio en FEB (verano feb–jul) y en MAY (verano may–oct) se cubre todo lo
 * alcanzable. Para los meses en que ambos dan la misma temporada basta una sola
 * consulta, que es lo que reduce la matriz de 24 a 18 requests por tarifa-año.
 *
 * Mayo–julio nunca caen fuera de verano y noviembre–enero nunca caen dentro,
 * bajo ninguna de las cuatro opciones que ofrece CFE.
 */
export function summerStartProbes(month: number): number[] {
  const probes = [2, 5];
  const seen = new Set<Season>();
  const needed: number[] = [];
  for (const probe of probes) {
    const season = seasonFor(probe, month);
    if (!seen.has(season)) {
      seen.add(season);
      needed.push(probe);
    }
  }
  return needed;
}
