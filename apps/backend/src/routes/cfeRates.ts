import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../validacion.ts';
import { ErrorApi, NoEncontradoError } from '../errores.ts';
import { seasonFor } from '@cotizador/cfe-scraper';
import type { VariablesApp } from '../tipos.ts';

export const cfeRatesRoutes = new Hono<{ Variables: VariablesApp }>();

const TARIFF_CODES = ['1', '1A', '1B', '1C', '1D', '1E', '1F'] as const;

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

  const resultados = await Promise.all(
    periodos.map(async ({ year, month }) => {
      // Sin `mesInicioVerano` no hay forma de saber la temporada: se asume
      // fuera de verano, que es el juego de cuotas común a todas las tarifas.
      const season = mesInicioVerano === null ? 'non_summer' : seasonFor(mesInicioVerano, month);
      const escalones = await prisma.cfeTariffRate.findMany({
        where: { tariffCode: tarifa, year, month, season },
        orderBy: { tierIndex: 'asc' },
      });
      return { year, month, season, escalones, disponible: escalones.length > 0 };
    })
  );

  // `completo: false` NO es un error: el frontend avisa de "cálculo aproximado".
  return c.json({ tarifa, mesInicioVerano, periodos: resultados, completo: resultados.every((r) => r.disponible) });
});
