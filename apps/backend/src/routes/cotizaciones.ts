import { Hono } from 'hono';
import { zValidator } from '../validacion.ts';
import { z } from 'zod';
import {
  consumoPeriodoSchema,
  equipoSeleccionadoSchema,
  otrosCargosSchema,
  calcularPromedios,
  calcularDimensionamiento,
  calcularTotalesCotizacion,
  calcularBeneficiosAmbientales,
  calcularROI,
  calcularTIR5Anos,
} from '@cotizador/shared';
import { NoEncontradoError } from '../errores.ts';
import type { VariablesApp } from '../tipos.ts';

export const cotizacionesRoutes = new Hono<{ Variables: VariablesApp }>();

const calcularSchema = z.object({
  consumos: z.array(consumoPeriodoSchema).length(6),
  periodo: z.string().default('Bimestral'),
  equipo: equipoSeleccionadoSchema,
  otrosCargos: otrosCargosSchema,
});

/**
 * Corre el mismo motor de cálculo que usa el guardado, pero sin persistir nada.
 * Sirve para el preview en vivo del front y como prueba de paridad front/back.
 */
cotizacionesRoutes.post('/calcular', zValidator('json', calcularSchema), async (c) => {
  const prisma = c.get('prisma');
  const { consumos, periodo, equipo, otrosCargos } = c.req.valid('json');

  const factoresRaw = await prisma.factoresCalculo.findUnique({ where: { id: '1' } });
  if (!factoresRaw) {
    return c.json({ error: { codigo: 'SIN_CONFIGURAR', mensaje: 'Los factores de cálculo no están configurados' } }, 500);
  }
  const factores = { ...factoresRaw, factoresEstacionales: JSON.parse(factoresRaw.factoresEstacionales) as number[] };

  const panel = equipo.panelClave ? await prisma.panel.findUnique({ where: { clave: equipo.panelClave } }) : null;
  const estructura = otrosCargos.estructuraId
    ? await prisma.estructura.findUnique({ where: { id: otrosCargos.estructuraId } })
    : null;

  const promedios = calcularPromedios(consumos);
  const dimensionamiento = calcularDimensionamiento({
    panel: panel ?? undefined,
    cantPaneles: equipo.cantPaneles,
    consumoPromedioKwh: promedios.consumoPromedioKwh,
    pagoPromedioCFE: promedios.pagoPromedioCFE,
    factores,
  });

  const totales = calcularTotalesCotizacion({
    conceptos: otrosCargos.conceptos,
    cargosEditables: otrosCargos.cargosEditables,
    precioEstructura: estructura?.precio ?? 0,
    descuento5: otrosCargos.descuento5,
    descuento10: otrosCargos.descuento10,
    incluirIva: otrosCargos.incluirIva,
    ivaPorcentaje: factores.ivaPorcentaje,
  });

  const multiplicadorAnual = periodo === 'Bimestral' ? 6 : 12;
  const ahorroAnual = dimensionamiento.ahorro * multiplicadorAnual;
  const ambiental = calcularBeneficiosAmbientales(
    dimensionamiento.produccion,
    periodo,
    factores.factorCo2,
    factores.factorArboles,
    factores.factorKmAuto
  );
  const roiTexto = calcularROI(totales.granTotal, ahorroAnual);
  const tirPorcentaje = calcularTIR5Anos(totales.granTotal, ahorroAnual, factores.inflacionCfe);

  return c.json({
    ...promedios,
    ...dimensionamiento,
    ...totales,
    ahorroAnual,
    ...ambiental,
    roiTexto,
    tirPorcentaje,
  });
});

// ─────────────────────────────────────────────────────────
// Historial de cotizaciones
//
// `obtenerProyectoHidratado` hace `take: 1` y solo expone la última versión.
// Estas rutas dan acceso al histórico completo, que es lo que necesita la
// sección de Configuración -> Historial de cotizaciones.
// ─────────────────────────────────────────────────────────

const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

cotizacionesRoutes.get('/', zValidator('query', paginacionSchema), async (c) => {
  const prisma = c.get('prisma');
  const { pagina, porPagina } = c.req.valid('query');

  const [datos, total] = await Promise.all([
    prisma.cotizacion.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, contacto: { select: { nombre: true, apellidoPaterno: true } } } },
      },
    }),
    prisma.cotizacion.count(),
  ]);

  return c.json({ datos, total, pagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) });
});

cotizacionesRoutes.get('/proyecto/:proyectoId', async (c) => {
  const prisma = c.get('prisma');
  const versiones = await prisma.cotizacion.findMany({
    where: { proyectoId: c.req.param('proyectoId') },
    orderBy: { version: 'desc' },
    include: { conceptos: { orderBy: { orden: 'asc' } }, cargos: { orderBy: { orden: 'asc' } } },
  });
  if (versiones.length === 0) throw new NoEncontradoError('Cotizaciones del proyecto');
  return c.json(versiones);
});

cotizacionesRoutes.get('/:id', async (c) => {
  const prisma = c.get('prisma');
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: c.req.param('id') },
    include: {
      conceptos: { orderBy: { orden: 'asc' } },
      cargos: { orderBy: { orden: 'asc' } },
      proyecto: { include: { contacto: true } },
    },
  });
  if (!cotizacion) throw new NoEncontradoError('Cotización');
  return c.json(cotizacion);
});
