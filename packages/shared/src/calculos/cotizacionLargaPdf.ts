import { calcularDetalleRetornoInversion } from './bancoSolar.ts';
import { calcularROI, calcularTIR5Anos } from './financiero.ts';
import { calcularBeneficiosAmbientales } from './ambiental.ts';
import { construirCotizacionPdf } from './cotizacionPdf.ts';
import { separarMarcaYModelo } from './equipo.ts';
import { normalizarTipoEquipoInversor } from '../schemas/proyecto.ts';
import type {
  CotizacionCotizable,
  ProyectoCotizable,
} from './cotizacionPdf.ts';
import type { EscalonTarifa } from './importeCfe.ts';
import type { ConsumoPeriodo } from '../types/dominio.ts';
import type { EmpresaPdf } from '../types/cotizacionPdf.ts';
import type {
  DatosCotizacionLargaPdf,
  GraficaPdf,
  PuntosSerieSvg,
} from '../types/cotizacionLargaPdf.ts';

/**
 * Geometría de las gráficas de la hoja 2, tomada de la plantilla de
 * referencia (área de trazo de 6 puntos). Ver el comentario de
 * `cotizacion-larga-template.html`: `x_i = 85 + 56.7·i` y
 * `y = 170.1 − valor/máximo · 141.8`.
 */
const GRAFICA_X0 = 85;
const GRAFICA_PASO_X = 56.7;
const GRAFICA_Y_BASE = 170.1;
const GRAFICA_ALTO = 141.8;
const ETIQUETAS_EJE_Y = 6;
const ANIOS_PROYECCION = 5;

/** Datos del pie cuando Configuración → Empresa no los trae (vacíos o sin capturar). */
const EMPRESA_POR_DEFECTO = {
  nombre: 'ZAC Solar',
  direccion: 'Zacualpan, Nayarit',
  telefono: '327-110-5784 / 327-112-8421',
};

/** Consumo de una fila tal como lo entrega el proyecto hidratado (numérico). */
export interface ConsumoCotizableLargo {
  inicioStr: string;
  terminoStr: string;
  kwh: number;
  pago: number;
}

/**
 * La cotización vigente. Es la misma forma que usa la cotización corta: marca y modelo
 * del equipo salen de `panelNombre`/`inversorNombre` y el tipo, de `tipoEquipoInversor`.
 */
export type CotizacionCotizableLarga = CotizacionCotizable;

export interface ProyectoCotizableLargo extends Omit<ProyectoCotizable, 'cotizaciones'> {
  periodo: string;
  /** Más reciente primero, igual que en el wizard. */
  consumos: ConsumoCotizableLargo[];
  cotizaciones: [CotizacionCotizableLarga, ...CotizacionCotizableLarga[]];
}

export interface EntradaCotizacionLargaPdf {
  proyecto: ProyectoCotizableLargo;
  empresa: EmpresaPdf | null;
  fecha: Date;
  firmantePorDefecto?: { nombre: string; puesto?: string };
  /** Mínimo de CFE por periodo (constante del wizard; `shared` no la conoce). */
  pagoMinimoCfe: number;
  factoresEstacionales?: number[];
  /** Escalones reales de CFE por periodo, alineados con `consumos`. Opcional. */
  escalonesPorPeriodo?: Array<EscalonTarifa[] | null>;
}

/** Redondea a centavos evitando el ruido binario (mismo criterio que la cotización corta). */
function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

// ── Formato ──────────────────────────────────────────────────────────────

function numero(valor: number, decimales = 0): string {
  return valor.toLocaleString('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** `$1,057.37`; el signo va antes del símbolo (`-$5,141.97`), nunca dentro. */
export function formatearDinero(valor: number): string {
  const redondeado = Math.round((valor + Number.EPSILON) * 100) / 100;
  // `-0` se imprimiría como "-$0.00".
  const signo = redondeado < 0 ? '-' : '';
  return `${signo}$${numero(Math.abs(redondeado), 2)}`;
}

/** "Mar 2026" → { mes: "Mar", anio: "26" }. Si no se reconoce, no inventa nada. */
function partirPeriodo(texto: string): { mes: string; anio: string } {
  const partes = texto.trim().split(/\s+/);
  const ultimo = partes[partes.length - 1] ?? '';
  if (partes.length >= 2 && /^\d{4}$/.test(ultimo)) {
    const mes = (partes[0] ?? '').slice(0, 3);
    return { mes: mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase(), anio: ultimo.slice(2) };
  }
  return { mes: texto.trim(), anio: '' };
}

// ── Gráficas ─────────────────────────────────────────────────────────────

/**
 * Máximo "redondo" del eje: 5 intervalos iguales cuyo paso sube hasta el
 * siguiente múltiplo de `granularidad` (638 kWh, granularidad 10 → paso 130 →
 * máximo 650). Con máximo 0 devuelve un eje mínimo para no dividir entre cero.
 */
export function calcularEjeY(
  maximo: number,
  granularidad: number
): { paso: number; tope: number } {
  const intervalos = ETIQUETAS_EJE_Y - 1;
  const paso = Math.max(granularidad, Math.ceil(maximo / intervalos / granularidad) * granularidad);
  return { paso, tope: paso * intervalos };
}

/** Convierte valores en puntos SVG `"x,y x,y …"` contra un tope de eje dado. */
export function calcularPuntosGrafica(valores: number[], tope: number): PuntosSerieSvg {
  return valores
    .map((valor, i) => {
      const x = GRAFICA_X0 + GRAFICA_PASO_X * i;
      const y = GRAFICA_Y_BASE - (tope > 0 ? valor / tope : 0) * GRAFICA_ALTO;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function construirEjes(
  paso: number,
  formatearEtiqueta: (valor: number) => string,
  periodosCronologicos: string[]
): GraficaPdf {
  const ejeY = Array.from({ length: ETIQUETAS_EJE_Y }, (_, i) =>
    formatearEtiqueta(paso * (ETIQUETAS_EJE_Y - 1 - i))
  );
  return { ejeY, ejeX: periodosCronologicos.map(partirPeriodo) };
}

// ── Builder ──────────────────────────────────────────────────────────────

function promedio(valores: number[]): number {
  return valores.length > 0 ? valores.reduce((acc, v) => acc + v, 0) / valores.length : 0;
}

/**
 * Traduce proyecto + cotización vigente al documento de 7 hojas.
 *
 * Pura y determinista (la fecha entra por parámetro). Reutiliza los cálculos
 * del wizard en vez de duplicarlos: lo que el asesor vio al cotizar es lo que
 * se imprime, salvo el detalle por periodo, que se recalcula (el snapshot de
 * la cotización solo guarda totales).
 */
export function construirCotizacionLargaPdf(
  entrada: EntradaCotizacionLargaPdf
): DatosCotizacionLargaPdf {
  const { proyecto, empresa } = entrada;
  const cotizacion = proyecto.cotizaciones[0];
  if (!cotizacion) {
    throw new Error('El proyecto no tiene una cotización vigente (cotizaciones[0] vacío).');
  }

  // Hoja 7: se reutiliza la cotización corta (líneas, cliente, firmante), pero
  // sin IVA: la plantilla larga lo muestra aparte, en el bloque de totales. Se
  // construye con `granTotal = subtotalConDescuento` y `montoIva = 0` para que
  // el cuadre de centavos de `construirCotizacionPdf` apunte al **subtotal**.
  // Si se construyera con IVA y luego se quitara esa línea, el residuo de
  // redondeo (que se absorbe en la última, la de IVA) se perdería y las filas
  // dejarían de sumar el subtotal impreso.
  const base = construirCotizacionPdf({
    proyecto: {
      ...proyecto,
      cotizaciones: [
        {
          ...cotizacion,
          montoIva: 0,
          granTotal: cotizacion.subtotalConDescuento,
        },
      ],
    },
    empresa,
    fecha: entrada.fecha,
    firmantePorDefecto: entrada.firmantePorDefecto,
  });

  // Subtotal, IVA y total impresos: el IVA es la diferencia de los otros dos ya
  // redondeados, así que en el papel Subtotal + IVA = Total siempre, al centavo.
  const subtotalImpreso = redondear2(cotizacion.subtotalConDescuento);
  const totalImpreso = redondear2(cotizacion.granTotal);
  const ivaImpreso = redondear2(totalImpreso - subtotalImpreso);

  // Hoja 1
  const consumos = proyecto.consumos;
  const totalKwh = consumos.reduce((acc, c) => acc + c.kwh, 0);
  const totalPago = consumos.reduce((acc, c) => acc + c.pago, 0);

  // Hoja 3: el detalle por periodo espera `ConsumoPeriodo` (texto, como el wizard).
  const consumosWizard: ConsumoPeriodo[] = consumos.map((c) => ({
    inicioStr: c.inicioStr,
    terminoStr: c.terminoStr,
    kwh: String(c.kwh),
    pago: String(c.pago),
  }));
  const detalle = calcularDetalleRetornoInversion(
    consumosWizard,
    cotizacion.produccionPeriodo,
    entrada.pagoMinimoCfe,
    entrada.factoresEstacionales,
    entrada.escalonesPorPeriodo
  );

  // Hoja 2: las gráficas van en orden cronológico (al revés que las tablas).
  const cronologico = <T,>(filas: T[]): T[] => filas.slice().reverse();
  const consumoKwh = cronologico(detalle.filas.map((f) => f.consumoHistorico));
  const produccionKwh = cronologico(detalle.filas.map((f) => f.energiaGenerada));
  const pagoHistorico = cronologico(detalle.filas.map((f) => f.pagoHistorico));
  const pagoNuevo = cronologico(detalle.filas.map((f) => f.nuevoPagoCFE));
  const periodosCronologicos = cronologico(consumos.map((c) => c.inicioStr));

  const ejeKwh = calcularEjeY(Math.max(0, ...consumoKwh, ...produccionKwh), 10);
  const ejePagos = calcularEjeY(Math.max(0, ...pagoHistorico, ...pagoNuevo), 100);

  // Hoja 6
  const beneficios = calcularBeneficiosAmbientales(cotizacion.produccionPeriodo, proyecto.periodo);
  const periodosPorAnio = proyecto.periodo === 'Bimestral' ? 6 : 12;
  const pagoPromedioSin = promedio(consumos.map((c) => c.pago));
  // El nuevo pago medio sale del detalle (no del snapshot `nuevoPago`, que es de un solo periodo).
  const pagoPromedioCon = promedio(detalle.filas.map((f) => f.nuevoPagoCFE));
  const ahorroPromedio = pagoPromedioSin - pagoPromedioCon;

  // Proyección a 5 años con la misma inflación que `calcularProyeccion5Anos`, pero sin su
  // piso en 0: la plantilla admite un ahorro negativo (p. ej. inversión que no se recupera en
  // 5 años) y ocultarlo mostraría una cifra más favorable que la real.
  const proyeccion = proyectar5Anos(
    pagoPromedioSin * periodosPorAnio,
    pagoPromedioCon * periodosPorAnio,
    cotizacion.granTotal
  );

  return {
    titulo: base.titulo,
    empresa: {
      nombre: empresa?.nombre.trim() || EMPRESA_POR_DEFECTO.nombre,
      correo: empresa?.email.trim() ?? '',
      // `EmpresaPdf` aún no tiene sitio web: el pie lo omite si va vacío.
      web: '',
      direccion: empresa?.localidad.trim() || EMPRESA_POR_DEFECTO.direccion,
      telefono: empresa?.telefono.trim() || EMPRESA_POR_DEFECTO.telefono,
    },

    consumoHistorico: consumos.map((c) => ({
      inicio: c.inicioStr,
      termino: c.terminoStr,
      kwh: numero(c.kwh),
      pagoCfe: formatearDinero(c.pago),
    })),
    totalKwh: numero(totalKwh),
    totalPagoCfe: formatearDinero(totalPago),

    graficaConsumo: {
      ...construirEjes(ejeKwh.paso, (v) => numero(v), periodosCronologicos),
      puntosConsumo: calcularPuntosGrafica(consumoKwh, ejeKwh.tope),
      puntosProduccion: calcularPuntosGrafica(produccionKwh, ejeKwh.tope),
    },
    graficaPagos: {
      ...construirEjes(ejePagos.paso, (v) => numero(v), periodosCronologicos),
      puntosHistorico: calcularPuntosGrafica(pagoHistorico, ejePagos.tope),
      puntosNuevo: calcularPuntosGrafica(pagoNuevo, ejePagos.tope),
    },

    retornoInversion: detalle.filas.map((fila, i) => ({
      inicio: consumos[i]?.inicioStr ?? '',
      termino: consumos[i]?.terminoStr ?? '',
      consumoHistorico: numero(fila.consumoHistorico),
      energiaGenerada: numero(fila.energiaGenerada),
      nuevoPagoCfe: formatearDinero(fila.nuevoPagoCFE),
      pagoHistorico: formatearDinero(fila.pagoHistorico),
      ahorroPeriodo: formatearDinero(fila.ahorroPeriodo),
    })),
    // El encabezado de la tabla suma sus propias filas, para que la hoja cuadre.
    ahorroAnual: formatearDinero(detalle.ahorroAnualTotal),
    usoTarifaReal: detalle.usoTarifaReal,

    panel: {
      ...separarMarcaYModelo(cotizacion.panelNombre),
      cantidad: cotizacion.cantPaneles,
    },
    inversor: {
      tipo: normalizarTipoEquipoInversor(cotizacion.tipoEquipoInversor),
      ...separarMarcaYModelo(cotizacion.inversorNombre),
      cantidad: cotizacion.cantInversores,
    },

    beneficios: {
      co2Kg: numero(beneficios.kgCO2, 2),
      arboles: numero(beneficios.arboles),
      kmAuto: numero(beneficios.kmAuto, 2),
    },
    proyeccion: {
      anios: ANIOS_PROYECCION,
      gastoSinPaneles: formatearDinero(proyeccion.sinPaneles),
      gastoConPaneles: formatearDinero(proyeccion.conPaneles),
      ahorro: formatearDinero(proyeccion.sinPaneles - proyeccion.conPaneles),
      recuperacionInversion: calcularROI(cotizacion.granTotal, detalle.ahorroAnualTotal),
      // `calcularTIR5Anos` ya devuelve el porcentaje (12.5 = 12.5 %); no se reescala.
      tir: `${numero(calcularTIR5Anos(cotizacion.granTotal, detalle.ahorroAnualTotal), 2)} %`,
      pagoPromedioSinPaneles: formatearDinero(pagoPromedioSin),
      pagoPromedioConPaneles: formatearDinero(pagoPromedioCon),
      ahorroPromedio: formatearDinero(ahorroPromedio),
    },

    cotizacion: {
      lineas: base.lineas,
      subtotal: formatearDinero(subtotalImpreso),
      iva: formatearDinero(ivaImpreso),
      total: formatearDinero(totalImpreso),
    },
    clienteNombre: base.cliente,
    asesorNombre: base.firmaNombre,
    ubicacion: base.ubicacion,
    metodoPago: base.metodoPago,
  };
}

/** Gasto acumulado a 5 años sin y con paneles (inflación CFE 4 %, inversión incluida con paneles). */
function proyectar5Anos(
  pagoAnualSin: number,
  pagoAnualCon: number,
  inversion: number,
  inflacion = 0.04
): { sinPaneles: number; conPaneles: number } {
  let sinPaneles = 0;
  let conPaneles = inversion;
  for (let anio = 0; anio < ANIOS_PROYECCION; anio++) {
    const factor = Math.pow(1 + inflacion, anio);
    sinPaneles += pagoAnualSin * factor;
    conPaneles += pagoAnualCon * factor;
  }
  return { sinPaneles, conPaneles };
}
