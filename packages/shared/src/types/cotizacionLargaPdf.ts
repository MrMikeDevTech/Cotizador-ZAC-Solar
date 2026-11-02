/**
 * Contrato del PDF de "cotización larga" (7 hojas).
 *
 * Igual que `DatosCotizacionPdf`, es un objeto plano y **ya formateado**: el
 * componente que lo pinta solo coloca texto. Los nombres de campo siguen los
 * placeholders de `docs/referencia-cotizacion/cotizacion-larga-template.html`
 * (pasados a camelCase) para poder contrastar documento y plantilla.
 *
 * Convención de formato:
 * - Dinero: con `$` y signo delante del símbolo (`$1,057.37`, `-$5,141.97`).
 * - Energía: número con separador de miles, sin unidad (la unidad es texto fijo
 *   de la plantilla: "kWh").
 */

import type { TipoEquipoInversor } from '../schemas/proyecto.ts';
import type { LineaCotizacionPdf } from './cotizacionPdf.ts';

/** Fila de la tabla de consumo histórico (hoja 1). */
export interface FilaConsumoHistoricoPdf {
  inicio: string;
  termino: string;
  kwh: string;
  pagoCfe: string;
}

/** Fila de la tabla de retorno de inversión (hoja 3). */
export interface FilaRetornoInversionPdf {
  inicio: string;
  termino: string;
  consumoHistorico: string;
  energiaGenerada: string;
  nuevoPagoCfe: string;
  pagoHistorico: string;
  ahorroPeriodo: string;
}

/** Una serie ya convertida a coordenadas SVG: `"x,y x,y …"`. */
export type PuntosSerieSvg = string;

export interface GraficaPdf {
  /** Etiquetas del eje Y, de la mayor a 0 (6 etiquetas). */
  ejeY: string[];
  /** Etiquetas del eje X en orden cronológico. */
  ejeX: Array<{ mes: string; anio: string }>;
}

export interface DatosCotizacionLargaPdf {
  titulo: string;
  empresa: {
    nombre: string;
    correo: string;
    web: string;
    direccion: string;
    telefono: string;
  };

  // Hoja 1
  consumoHistorico: FilaConsumoHistoricoPdf[];
  totalKwh: string;
  totalPagoCfe: string;

  // Hoja 2
  graficaConsumo: GraficaPdf & { puntosConsumo: PuntosSerieSvg; puntosProduccion: PuntosSerieSvg };
  graficaPagos: GraficaPdf & { puntosHistorico: PuntosSerieSvg; puntosNuevo: PuntosSerieSvg };

  // Hoja 3
  retornoInversion: FilaRetornoInversionPdf[];
  ahorroAnual: string;
  /**
   * `false` si algún periodo se calculó con el respaldo offline (promedio
   * pago/kWh) en vez de la tarifa escalonada real de CFE.
   */
  usoTarifaReal: boolean;

  // Hoja 4
  panel: { modelo: string; marca: string; cantidad: number };
  /**
   * `tipo` decide el texto "Inversor"/"Microinversor" de la hoja de tecnología y de la
   * tabla de garantías. `marca` y `modelo` salen del nombre de catálogo ("Marca, Modelo").
   */
  inversor: { tipo: TipoEquipoInversor; modelo: string; marca: string; cantidad: number };

  // Hoja 6
  beneficios: { co2Kg: string; arboles: string; kmAuto: string };
  proyeccion: {
    anios: number;
    gastoSinPaneles: string;
    gastoConPaneles: string;
    ahorro: string;
    recuperacionInversion: string;
    tir: string;
    pagoPromedioSinPaneles: string;
    pagoPromedioConPaneles: string;
    ahorroPromedio: string;
  };

  // Hoja 7
  cotizacion: {
    /** Importes en número; el componente los formatea como en la cotización corta. */
    lineas: LineaCotizacionPdf[];
    subtotal: string;
    iva: string;
    total: string;
  };
  clienteNombre: string;
  asesorNombre: string;
  /** "Localidad, Estado" (misma regla que la cotización corta). */
  ubicacion: string;
  /** Tal como se eligió en el Paso 4 (opción predefinida o texto personalizado). */
  metodoPago: string;
}
