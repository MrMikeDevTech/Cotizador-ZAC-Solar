import type { PrismaClient } from '../generated/prisma/client.ts';
import {
  PANELES_INICIALES,
  INVERSORES_INICIALES,
  ESTRUCTURAS_INICIALES,
  CONCEPTOS_COTIZACION_DEFECTO,
  TARIFAS_INICIALES,
  LOCALIDADES_INICIALES,
  DATOS_EMPRESA_DEFECTO,
  FACTORES_CALCULO_DEFECTO,
} from '@cotizador/shared';

/**
 * Siembra idempotente: si una tabla de catálogo ya tiene filas, no la toca.
 * Así la app recién instalada se comporta igual que hoy (constants/index.ts),
 * y una vez que el usuario edita algo desde /config no se sobreescribe.
 */
export async function sembrarCatalogos(prisma: PrismaClient): Promise<void> {
  await prisma.empresa.upsert({
    where: { id: '1' },
    create: { id: '1', ...DATOS_EMPRESA_DEFECTO },
    update: {},
  });

  await prisma.factoresCalculo.upsert({
    where: { id: '1' },
    create: {
      id: '1',
      ...FACTORES_CALCULO_DEFECTO,
      factoresEstacionales: JSON.stringify(FACTORES_CALCULO_DEFECTO.factoresEstacionales),
    },
    update: {},
  });

  const totalPaneles = await prisma.panel.count();
  if (totalPaneles === 0) {
    for (const panel of PANELES_INICIALES) {
      await prisma.panel.create({ data: panel });
    }
  }

  const totalInversores = await prisma.inversor.count();
  if (totalInversores === 0) {
    for (const inversor of INVERSORES_INICIALES) {
      await prisma.inversor.create({ data: inversor });
    }
  }

  const totalEstructuras = await prisma.estructura.count();
  if (totalEstructuras === 0) {
    for (const { id, ...estructura } of ESTRUCTURAS_INICIALES) {
      await prisma.estructura.create({ data: estructura });
    }
  }

  const totalConceptos = await prisma.conceptoPlantilla.count();
  if (totalConceptos === 0) {
    for (const { id, ...concepto } of CONCEPTOS_COTIZACION_DEFECTO) {
      await prisma.conceptoPlantilla.create({ data: concepto });
    }
  }

  const totalTarifas = await prisma.tarifa.count();
  if (totalTarifas === 0) {
    for (const tarifa of TARIFAS_INICIALES) {
      await prisma.tarifa.create({ data: tarifa });
    }
  }

  const totalLocalidades = await prisma.localidad.count();
  if (totalLocalidades === 0) {
    for (const localidad of LOCALIDADES_INICIALES) {
      await prisma.localidad.create({ data: localidad });
    }
  }
}
