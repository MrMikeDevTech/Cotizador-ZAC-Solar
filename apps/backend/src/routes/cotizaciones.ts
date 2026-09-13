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
