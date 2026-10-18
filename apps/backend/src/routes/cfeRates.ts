import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../validacion.ts';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import { seasonFor } from '@cotizador/cfe-scraper';
import { syncCfeRates } from '../servicios/cfeRates.ts';
import type { VariablesApp } from '../tipos.ts';

export const cfeRatesRoutes = new Hono<{ Variables: VariablesApp }>();

const TARIFF_CODES = ['1', '1A', '1B', '1C', '1D', '1E', '1F', 'DAC'] as const;

const consultaSchema = z.object({
  tariff: z.enum(TARIFF_CODES),
  // Los query params llegan como string: `coerce` los convierte antes de validar.
  year: z.coerce.number().int().positive(),
  month: z.coerce.number().int().min(1).max(12),
  season: z.enum(['summer', 'non_summer']).optional(),
});

/** Verano primero; es el orden en que CFE los presenta. */
const ORDEN_TEMPORADA = { summer: 0, non_summer: 1 } as const;

// `/status` se declara antes que `/` para que el enrutador no la capture como otra cosa.
cfeRatesRoutes.get('/status', async (c) => {
  const prisma = c.get('prisma');

  // Un solo groupBy en vez de un count por periodo: con el histórico completo
  // (~1,500 periodos) la variante por bucle haría una query por fila.
  const [agregado, periodosRaw] = await Promise.all([
    prisma.cfeTariffRate.aggregate({ _max: { fetchedAt: true }, _count: { _all: true } }),
    prisma.cfeTariffRate.groupBy({
      by: ['tariffCode', 'year', 'month', 'season'],
      _count: { _all: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }, { tariffCode: 'asc' }],
    }),
  ]);

  return c.json({
    lastFetchedAt: agregado._max.fetchedAt ?? null,
    totalRows: agregado._count._all,
    periods: periodosRaw.map((p) => ({
      tariffCode: p.tariffCode,
      year: p.year,
      month: p.month,
      season: p.season,
      tierCount: p._count._all,
    })),
  });
});

cfeRatesRoutes.get('/', zValidator('query', consultaSchema), async (c) => {
  const prisma = c.get('prisma');
  const { tariff, year, month, season } = c.req.valid('query');

  // DAC tiene su propia tabla y forma: por región, sin escalones de consumo.
  if (tariff === 'DAC') {
    const filas = await prisma.cfeDacRate.findMany({
      where: { year, month },
      orderBy: { region: 'asc' },
    });

    if (filas.length === 0) {
      throw new NoEncontradoError(`Tarifa DAC para ${year}-${String(month).padStart(2, '0')}`);
    }

    return c.json({
      tariffCode: tariff,
      year,
      month,
      regions: filas.map((f) => ({
        region: f.region,
        cargoFijo: f.cargoFijo,
        precioKwh: f.precioKwh,
        precioKwhVerano: f.precioKwhVerano,
      })),
    });
  }

  // Tarifas escalonadas (1, 1A, 1B, 1C, 1D, 1E, 1F)
  const escalones = await prisma.cfeTariffRate.findMany({
    where: { tariffCode: tariff, year, month, ...(season ? { season } : {}) },
    orderBy: { tierIndex: 'asc' },
  });

  if (escalones.length === 0) {
    throw new NoEncontradoError(`Tarifa ${tariff} para ${year}-${String(month).padStart(2, '0')}`);
  }

  // Agrupa por temporada conservando el orden por tierIndex que ya trae la query.
  const porTemporada = new Map<string, typeof escalones>();
  for (const escalon of escalones) {
    const existentes = porTemporada.get(escalon.season);
    if (existentes) existentes.push(escalon);
    else porTemporada.set(escalon.season, [escalon]);
  }

  const seasons = [...porTemporada.entries()]
    .sort(([a], [b]) => {
      const pa = ORDEN_TEMPORADA[a as keyof typeof ORDEN_TEMPORADA] ?? 99;
      const pb = ORDEN_TEMPORADA[b as keyof typeof ORDEN_TEMPORADA] ?? 99;
      return pa - pb;
    })
    .map(([nombre, filas]) => ({
      season: nombre,
      tiers: filas.map((f) => ({
        tierIndex: f.tierIndex,
        concept: f.concept,
        price: f.price,
        description: f.description,
        limitKwh: f.limitKwh,
      })),
    }));

  return c.json({ tariffCode: tariff, year, month, seasons });
});

// ─────────────────────────────────────────────────────────
// Sincronización manual de tarifas CFE
// ─────────────────────────────────────────────────────────

/**
 * Dispara una sincronización con el sitio de CFE y devuelve el resumen.
 *
 * **Degradación offline:** La aplicación es offline-first. Si la sincronización falla
 * (sin red, CFE cambió el HTML, certificado caducado), responde **200** con `ok: false`
 * y un mensaje legible del motivo. El frontend puede distinguir error transiente de
 * fallo de la app, así que sigue con lo guardado localmente.
 */
/**
 * Periodos concretos a descargar. Sin cuerpo, el scraper baja solo el mes en
 * curso — suficiente para mantener al día lo actual, pero inútil para un
 * historial de consumo, que se remonta un año atrás. El wizard manda aquí los
 * periodos que de verdad le faltan para no descargar de más.
 */
const syncSchema = z
  .object({
    periodos: z
      .array(z.object({ year: z.number().int().min(2000), month: z.number().int().min(1).max(12) }))
      .min(1)
      .max(24)
      .optional(),
  })
  .optional();

/**
 * `syncCfeRates` acepta un único `year` con una lista de meses, así que los
 * periodos se agrupan por año y se sincroniza una vez por año. Los totales se
 * suman para devolver un solo resumen.
 */
async function sincronizarPeriodos(
  prisma: Parameters<typeof syncCfeRates>[0],
  periodos: { year: number; month: number }[]
): Promise<Awaited<ReturnType<typeof syncCfeRates>>> {
  const porAnio = new Map<number, Set<number>>();
  for (const { year, month } of periodos) {
    const meses = porAnio.get(year) ?? new Set<number>();
    meses.add(month);
    porAnio.set(year, meses);
  }

  const total = { saved: 0, dacSaved: 0, missing: 0, errors: 0, durationMs: 0 };

  for (const [year, meses] of porAnio) {
    const parcial = await syncCfeRates(prisma, {
      year,
      months: [...meses].sort((a, b) => a - b),
      // Pedimos periodos concretos: caer al mes anterior falsearía el dato.
      fallbackToPreviousMonth: false,
    });
    total.saved += parcial.saved;
    total.dacSaved += parcial.dacSaved;
    total.missing += parcial.missing;
    total.errors += parcial.errors;
    total.durationMs += parcial.durationMs;
  }

  return total;
}

cfeRatesRoutes.post('/sync', async (c) => {
  const prisma = c.get('prisma');

  // El cuerpo es opcional: sin él se mantiene el comportamiento de siempre.
  let periodos: { year: number; month: number }[] | undefined;
  try {
    periodos = syncSchema.parse(await c.req.json().catch(() => undefined))?.periodos;
  } catch {
    throw new ErrorApi('VALIDACION', 'Formato de `periodos` inválido', 400);
  }

  try {
    const resultado = periodos
      ? await sincronizarPeriodos(prisma, periodos)
      : await syncCfeRates(prisma);
    return c.json(
      {
        ok: true,
        saved: resultado.saved,
        dacSaved: resultado.dacSaved,
        missing: resultado.missing,
        errors: resultado.errors,
        durationMs: resultado.durationMs,
      },
      200
    );
  } catch (error) {
    // Capturamos cualquier error de red o parseo y respondemos 200 con ok: false.
    // Esto permite que el frontend distinga un fallo de la app (5xx) de un caso
    // offline esperado (200 ok: false).
    const motivo =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error desconocido';
    return c.json(
      {
        ok: false,
        mensaje: `No se pudo sincronizar con CFE: ${motivo}`,
      },
      200
    );
  }
});

// ─────────────────────────────────────────────────────────
// Cuotas aplicables a los periodos de un recibo
//
// Resuelve, para cada periodo, qué temporada corresponde según el
// `mesInicioVerano` de la localidad, y devuelve sus escalones. Es lo que
// consume el motor de cálculo para cobrar con la tarifa escalonada real en
// lugar de promediar pago/kWh.
// ─────────────────────────────────────────────────────────

const aplicablesSchema = z.object({
  tarifa: z.string().min(1),
  localidadId: z.string().min(1),
  /** JSON con `[{ year, month }]`. */
  periodos: z.string().min(1),
});

const periodoSchema = z.array(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) })).min(1);

cfeRatesRoutes.get('/aplicables', zValidator('query', aplicablesSchema), async (c) => {
  const prisma = c.get('prisma');
  const { tarifa, localidadId, periodos: periodosCrudos } = c.req.valid('query');

  let periodos: Array<{ year: number; month: number }>;
  try {
    periodos = periodoSchema.parse(JSON.parse(periodosCrudos));
  } catch {
    throw new ErrorApi('VALIDACION', 'El parámetro `periodos` debe ser un JSON con [{ year, month }]', 400);
  }

  const localidad = await prisma.localidad.findUnique({ where: { id: localidadId } });

  // DAC no tiene escalones: se publica por región, como cargo fijo + precio plano.
  if (tarifa === 'DAC') {
    const region = localidad?.regionDac ?? null;
    const resultados = await Promise.all(
      periodos.map(async ({ year, month }) => {
        const fila = region
          ? await prisma.cfeDacRate.findUnique({ where: { year_month_region: { year, month, region } } })
          : null;
        return {
          year,
          month,
          region,
          dac: fila ? { cargoFijo: fila.cargoFijo, precioKwh: fila.precioKwh, precioKwhVerano: fila.precioKwhVerano } : null,
          disponible: fila !== null,
        };
      })
    );
    return c.json({ tarifa, periodos: resultados, completo: resultados.every((r) => r.disponible) });
  }

  const mesInicioVerano = localidad?.mesInicioVerano ?? null;

  /**
   * Escalones más recientes publicados para una tarifa y temporada, sin exigir
   * un periodo concreto.
   *
   * Es el respaldo que hace que cotizar sea instantáneo y no dependa de tener
   * descargado el histórico mes a mes: CFE no publica todos los periodos para
   * todas las temporadas (un mes de verano suele traer solo cuotas `summer`),
   * y un historial de consumo se remonta un año atrás. Para una cotización
   * interesa además el precio **vigente**, que es el que pagará el cliente de
   * aquí en adelante, no el de hace catorce meses.
   */
  async function ultimosEscalones(season: string) {
    const reciente = await prisma.cfeTariffRate.findFirst({
      where: { tariffCode: tarifa, season },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    if (!reciente) return null;

    const escalones = await prisma.cfeTariffRate.findMany({
      where: { tariffCode: tarifa, season, year: reciente.year, month: reciente.month },
      orderBy: { tierIndex: 'asc' },
    });
    return escalones.length > 0 ? { escalones, year: reciente.year, month: reciente.month } : null;
  }

  const resultados = await Promise.all(
    periodos.map(async ({ year, month }) => {
      // Sin `mesInicioVerano` no hay forma de saber la temporada: se asume
      // fuera de verano, que es el juego de cuotas común a todas las tarifas.
      const season = mesInicioVerano === null ? 'non_summer' : seasonFor(mesInicioVerano, month);

      const exactos = await prisma.cfeTariffRate.findMany({
        where: { tariffCode: tarifa, year, month, season },
        orderBy: { tierIndex: 'asc' },
      });
      if (exactos.length > 0) {
        return { year, month, season, escalones: exactos, disponible: true, exacto: true, origen: { year, month, season } };
      }

      // Sin cuotas para ese periodo exacto: se usan las últimas publicadas.
      // Se prueba primero la temporada que toca y luego la otra, porque un mes
      // de verano puede no tener cuotas `non_summer` publicadas en absoluto.
      const otra = season === 'summer' ? 'non_summer' : 'summer';
      const respaldo = (await ultimosEscalones(season)) ?? (await ultimosEscalones(otra));
      if (!respaldo) {
        return { year, month, season, escalones: [], disponible: false, exacto: false, origen: null };
      }

      return {
        year,
        month,
        season,
        escalones: respaldo.escalones,
        disponible: true,
        exacto: false,
        origen: { year: respaldo.year, month: respaldo.month, season: respaldo.escalones[0]?.season ?? season },
      };
    })
  );

  return c.json({
    tarifa,
    mesInicioVerano,
    periodos: resultados,
    // `completo` sigue significando "cuotas del periodo exacto", no "hay
    // número": el frontend lo usa para avisar de que el cálculo es aproximado.
    completo: resultados.every((r) => r.exacto),
  });
});
