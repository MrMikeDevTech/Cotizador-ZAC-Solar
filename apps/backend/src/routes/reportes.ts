import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../validacion.ts';
import type { VariablesApp } from '../tipos.ts';
import type { PrismaClient, Prisma } from '../generated/prisma/client.ts';

export const reportesRoutes = new Hono<{ Variables: VariablesApp }>();

/**
 * Suma el `granTotal` de la última versión de cotización de cada proyecto que
 * cumpla `whereProyecto` (nunca de todas las versiones: eso duplicaría el
 * monto de cualquier proyecto que se haya vuelto a cotizar).
 */
async function sumarGranTotalUltimasVersiones(
  prisma: PrismaClient,
  whereProyecto?: Prisma.ProyectoWhereInput
): Promise<number> {
  const maximos = await prisma.cotizacion.groupBy({
    by: ['proyectoId'],
    where: whereProyecto ? { proyecto: whereProyecto } : undefined,
    _max: { version: true },
  });

  const pares = maximos
    .filter((m): m is typeof m & { _max: { version: number } } => m._max.version !== null)
    .map((m) => ({ proyectoId: m.proyectoId, version: m._max.version }));
  if (pares.length === 0) return 0;

  const agregado = await prisma.cotizacion.aggregate({
    where: { OR: pares },
    _sum: { granTotal: true },
  });
  return agregado._sum.granTotal ?? 0;
}

// ─────────────────────────────────────────────────────────
// Resumen
// ─────────────────────────────────────────────────────────

reportesRoutes.get('/resumen', async (c) => {
  const prisma = c.get('prisma');

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [fases, conteosPorFase, contactosNuevosMes, cotizacionesEmitidas, faseVendido] = await Promise.all([
    prisma.funnelFase.findMany({ where: { deletedAt: null }, orderBy: { orden: 'asc' } }),
    prisma.proyecto.groupBy({ by: ['faseId'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.contacto.count({ where: { deletedAt: null, createdAt: { gte: inicioMes } } }),
    prisma.cotizacion.count({ where: { proyecto: { deletedAt: null } } }),
    prisma.funnelFase.findUnique({ where: { slug: 'vendido' } }),
  ]);

  const mapaConteo = new Map(conteosPorFase.map((g) => [g.faseId, g._count._all]));
  const proyectosPorFase = fases.map((fase) => ({
    faseId: fase.id,
    slug: fase.slug,
    nombre: fase.nombre,
    color: fase.color,
    total: mapaConteo.get(fase.id) ?? 0,
  }));

  const [montoTotalCotizado, montoTotalVendido] = await Promise.all([
    sumarGranTotalUltimasVersiones(prisma, { deletedAt: null }),
    faseVendido
      ? sumarGranTotalUltimasVersiones(prisma, { deletedAt: null, faseId: faseVendido.id })
      : Promise.resolve(0),
  ]);

  return c.json({
    proyectosPorFase,
    contactosNuevosMes,
    cotizacionesEmitidas,
    montoTotalCotizado,
    montoTotalVendido,
  });
});

// ─────────────────────────────────────────────────────────
// Proyectos del rango
// ─────────────────────────────────────────────────────────

const rangoSchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

reportesRoutes.get('/proyectos', zValidator('query', rangoSchema), async (c) => {
  const prisma = c.get('prisma');
  const { desde, hasta } = c.req.valid('query');

  const rangoFecha = { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) };
  const conRango = Object.keys(rangoFecha).length > 0;

  const proyectos = await prisma.proyecto.findMany({
    where: { deletedAt: null, ...(conRango ? { createdAt: rangoFecha } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      fase: true,
      contacto: true,
      cotizaciones: { orderBy: { version: 'desc' }, take: 1 },
    },
  });

  return c.json(
    proyectos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      createdAt: p.createdAt,
      fase: { id: p.fase.id, slug: p.fase.slug, nombre: p.fase.nombre, color: p.fase.color },
      contacto: { id: p.contacto.id, nombre: p.contacto.nombre, apellidoPaterno: p.contacto.apellidoPaterno },
      granTotal: p.cotizaciones[0]?.granTotal ?? null,
    }))
  );
});

// ─────────────────────────────────────────────────────────
// Actividad reciente (paginada)
// ─────────────────────────────────────────────────────────

const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

interface ItemActividad {
  id: string;
  tipo: 'proyecto' | 'contacto';
  accion: 'creado' | 'actualizado';
  titulo: string;
  fecha: string;
}

reportesRoutes.get('/actividad', zValidator('query', paginacionSchema), async (c) => {
  const prisma = c.get('prisma');
  const { pagina, porPagina } = c.req.valid('query');

  // Sin una tabla de auditoría dedicada, la actividad se deriva de los
  // timestamps de proyectos y contactos. Se trae como máximo hasta el final
  // de la página pedida de cada tabla, nunca el histórico completo.
  const limite = pagina * porPagina;

  const [proyectos, contactos, totalProyectos, totalContactos] = await Promise.all([
    prisma.proyecto.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limite,
      select: { id: true, nombre: true, createdAt: true, updatedAt: true },
    }),
    prisma.contacto.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limite,
      select: { id: true, nombre: true, apellidoPaterno: true, createdAt: true, updatedAt: true },
    }),
    prisma.proyecto.count({ where: { deletedAt: null } }),
    prisma.contacto.count({ where: { deletedAt: null } }),
  ]);

  // El tipo de retorno se anota en cada `map` en vez de usar `as const` sobre el
  // ternario: `as const` no es válido sobre una expresión condicional.
  const items: ItemActividad[] = [
    ...proyectos.map((p): ItemActividad => ({
      id: p.id,
      tipo: 'proyecto',
      accion: p.createdAt.getTime() === p.updatedAt.getTime() ? 'creado' : 'actualizado',
      titulo: p.nombre,
      fecha: p.updatedAt.toISOString(),
    })),
    ...contactos.map((ct): ItemActividad => ({
      id: ct.id,
      tipo: 'contacto',
      accion: ct.createdAt.getTime() === ct.updatedAt.getTime() ? 'creado' : 'actualizado',
      titulo: [ct.nombre, ct.apellidoPaterno].filter(Boolean).join(' '),
      fecha: ct.updatedAt.toISOString(),
    })),
  ];

  items.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const total = totalProyectos + totalContactos;
  const inicio = (pagina - 1) * porPagina;
  const datos = items.slice(inicio, inicio + porPagina);

  return c.json({ datos, total, pagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) });
});
