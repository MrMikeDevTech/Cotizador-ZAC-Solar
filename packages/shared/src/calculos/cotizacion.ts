import type { CargoEditable, ConceptoCotizacion } from '../types/dominio.ts';

export interface EntradaTotalesCotizacion {
  conceptos: ConceptoCotizacion[];
  cargosEditables: CargoEditable[];
  precioEstructura: number;
  descuento5: boolean;
  descuento10: boolean;
  incluirIva: boolean;
  ivaPorcentaje: number;
}

export interface ResultadoTotalesCotizacion {
  subtotalConceptos: number;
  subtotalCargosEditables: number;
  subtotalGeneral: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  subtotalConDescuento: number;
  montoIVA: number;
  granTotal: number;
  utilidadTotalMXN: number;
  porcentajeUtilidadTotal: number;
}

/**
 * Totales de la cotización (Paso 4 / Paso 5). Antes duplicada literalmente
 * entre page.tsx y Paso4OtrosCargos.tsx — ahora una sola fuente de verdad.
 */
export function calcularTotalesCotizacion({
  conceptos,
  cargosEditables,
  precioEstructura,
  descuento5,
  descuento10,
  incluirIva,
  ivaPorcentaje,
}: EntradaTotalesCotizacion): ResultadoTotalesCotizacion {
  const subtotalConceptos = conceptos.reduce(
    (acc, curr) => acc + curr.costoBase * (1 + curr.margenPorcentaje / 100),
    0
  );

  const subtotalCargosEditables = cargosEditables.reduce(
    (acc, curr) => acc + (Number(curr.monto) || 0),
    0
  );

  const subtotalGeneral = subtotalConceptos + subtotalCargosEditables + precioEstructura;

  let porcentajeDescuento = 0;
  if (descuento5) porcentajeDescuento += 5;
  if (descuento10) porcentajeDescuento += 10;

  const montoDescuento = subtotalGeneral * (porcentajeDescuento / 100);
  const subtotalConDescuento = subtotalGeneral - montoDescuento;

  const montoIVA = incluirIva ? subtotalConDescuento * (ivaPorcentaje / 100) : 0;
  const granTotal = subtotalConDescuento + montoIVA;

  const utilidadTotalMXN = conceptos.reduce(
    (acc, item) => acc + item.costoBase * (item.margenPorcentaje / 100),
    0
  );
  const porcentajeUtilidadTotal =
    subtotalConceptos > 0 ? (utilidadTotalMXN / subtotalConceptos) * 100 : 0;

  return {
    subtotalConceptos,
    subtotalCargosEditables,
    subtotalGeneral,
    porcentajeDescuento,
    montoDescuento,
    subtotalConDescuento,
    montoIVA,
    granTotal,
    utilidadTotalMXN,
    porcentajeUtilidadTotal,
  };
}

/** Conversión de moneda para mostrar el total en USD (hoy TablaCotizacion.tsx solo cambiaba el sufijo). */
export function convertirMoneda(montoMXN: number, tipoMoneda: 'MXN' | 'USD', valorDolar: number): number {
  return tipoMoneda === 'USD' && valorDolar > 0 ? montoMXN / valorDolar : montoMXN;
}
