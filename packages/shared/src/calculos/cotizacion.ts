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

/** Porcentajes de descuento por pago en una sola exhibición, acumulables. */
const DESCUENTO_5_PCT = 5;
const DESCUENTO_10_PCT = 10;

/**
 * Porcentaje de descuento resultante de las dos casillas del Paso 4.
 *
 * Vive aquí y no en el componente porque `ModalAjustesExtras` necesita la
 * misma regla para su vista previa: al tenerla duplicada, cambiar un
 * porcentaje dejaba el modal mostrando una cifra y la cotización otra.
 */
export function calcularPorcentajeDescuento(descuento5: boolean, descuento10: boolean): number {
  return (descuento5 ? DESCUENTO_5_PCT : 0) + (descuento10 ? DESCUENTO_10_PCT : 0);
}

/** Aplica el descuento a un subtotal. Comparte regla con `calcularTotalesCotizacion`. */
export function aplicarDescuento(
  subtotal: number,
  descuento5: boolean,
  descuento10: boolean
): { porcentajeDescuento: number; montoDescuento: number; subtotalConDescuento: number } {
  const porcentajeDescuento = calcularPorcentajeDescuento(descuento5, descuento10);
  const montoDescuento = subtotal * (porcentajeDescuento / 100);
  return { porcentajeDescuento, montoDescuento, subtotalConDescuento: subtotal - montoDescuento };
}

/** Total de un cargo adicional: costo base más su margen (0 si no tiene). */
export function totalDeCargo(cargo: Pick<CargoEditable, 'monto' | 'margenPorcentaje'>): number {
  return (Number(cargo.monto) || 0) * (1 + (Number(cargo.margenPorcentaje) || 0) / 100);
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

  // Un cargo adicional es un concepto más: costo base + margen.
  const subtotalCargosEditables = cargosEditables.reduce(
    (acc, curr) => acc + totalDeCargo(curr),
    0
  );

  const subtotalGeneral = subtotalConceptos + subtotalCargosEditables + precioEstructura;

  const { porcentajeDescuento, montoDescuento, subtotalConDescuento } = aplicarDescuento(
    subtotalGeneral,
    descuento5,
    descuento10
  );

  const montoIVA = incluirIva ? subtotalConDescuento * (ivaPorcentaje / 100) : 0;
  const granTotal = subtotalConDescuento + montoIVA;

  const utilidadTotalMXN =
    conceptos.reduce((acc, item) => acc + item.costoBase * (item.margenPorcentaje / 100), 0) +
    cargosEditables.reduce(
      (acc, c) => acc + (Number(c.monto) || 0) * ((Number(c.margenPorcentaje) || 0) / 100),
      0
    );
  const baseUtilidad = subtotalConceptos + subtotalCargosEditables;
  const porcentajeUtilidadTotal = baseUtilidad > 0 ? (utilidadTotalMXN / baseUtilidad) * 100 : 0;

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
