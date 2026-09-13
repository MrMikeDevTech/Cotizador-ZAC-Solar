import type { ConsumoPeriodo } from '../types/dominio.ts';
import type { PanelData, FactoresCalculo } from '../types/configuracion.ts';

export interface Promedios {
  consumoPromedioKwh: number;
  pagoPromedioCFE: number;
}

/** Promedios de consumo/pago sobre los 6 periodos capturados en el Paso 2. */
export function calcularPromedios(consumos: ConsumoPeriodo[]): Promedios {
  const sumaKwh = consumos.reduce((acc, curr) => acc + (Number(curr.kwh) || 0), 0);
  const sumaPago = consumos.reduce((acc, curr) => acc + (Number(curr.pago) || 0), 0);
  return {
    consumoPromedioKwh: sumaKwh / 6 || 1,
    pagoPromedioCFE: sumaPago / 6,
  };
}

export interface EntradaDimensionamiento {
  panel: Pick<PanelData, 'watts' | 'factorBifacial'> | undefined;
  cantPaneles: number;
  consumoPromedioKwh: number;
  pagoPromedioCFE: number;
  factores: Pick<FactoresCalculo, 'factorProduccion' | 'pagoMinimoCfe'>;
}

export interface ResultadoDimensionamiento {
  tamanoSistema: number;
  produccion: number;
  autoconsumo: number;
  nuevoPago: number;
  ahorro: number;
}

/** Dimensionamiento del sistema (Paso 3): producción, autoconsumo, nuevo pago CFE y ahorro por periodo. */
export function calcularDimensionamiento({
  panel,
  cantPaneles,
  consumoPromedioKwh,
  pagoPromedioCFE,
  factores,
}: EntradaDimensionamiento): ResultadoDimensionamiento {
  const cantidad = Number(cantPaneles) || 0;

  if (!panel) {
    return { tamanoSistema: 0, produccion: 0, autoconsumo: 0, nuevoPago: 0, ahorro: 0 };
  }

  const totalWatts = cantidad * panel.watts * panel.factorBifacial;
  const produccion = totalWatts * factores.factorProduccion;
  const autoconsumo = cantidad > 0 ? (produccion / consumoPromedioKwh) * 100 : 0;

  if (cantidad === 0) {
    return { tamanoSistema: totalWatts, produccion, autoconsumo, nuevoPago: 0, ahorro: 0 };
  }

  if (autoconsumo >= 100) {
    return {
      tamanoSistema: totalWatts,
      produccion,
      autoconsumo,
      nuevoPago: factores.pagoMinimoCfe,
      ahorro: pagoPromedioCFE - factores.pagoMinimoCfe,
    };
  }

  const nuevoPago =
    (1 - autoconsumo / 100) * (pagoPromedioCFE - factores.pagoMinimoCfe) + factores.pagoMinimoCfe;

  return {
    tamanoSistema: totalWatts,
    produccion,
    autoconsumo,
    nuevoPago,
    ahorro: pagoPromedioCFE - nuevoPago,
  };
}
