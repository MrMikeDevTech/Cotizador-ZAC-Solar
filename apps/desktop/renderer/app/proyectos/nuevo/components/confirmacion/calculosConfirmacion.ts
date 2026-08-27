import { ConsumoPeriodo, FilaRetornoInversion } from '../../types';
import { PAGO_MINIMO_CFE } from '../../constants';

/**
 * Genera un código abreviado a partir de un nombre y número/sufijo
 */
export function generarCodigoAbreviado(nombre: string, sufijo: string = '001'): string {
  const palabras = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return `PRJ-${sufijo}`;
  
  let iniciales = '';
  if (palabras.length >= 3) {
    iniciales = palabras[0][0] + palabras[1][0] + palabras[2][0];
  } else if (palabras.length === 2) {
    iniciales = palabras[0].slice(0, 2) + palabras[1][0];
  } else {
    iniciales = palabras[0].slice(0, 3);
  }
  return `${iniciales.toUpperCase()}-${sufijo}`;
}

/**
 * Formatea un número como moneda en pesos mexicanos
 */
export function formatearMoneda(monto: number, moneda: string = 'MXN'): string {
  return `$${monto.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${moneda}`;
}

/**
 * Calcula la producción solar estimada por periodo con variaciones estacionales típicas
 */
export function calcularProduccionEstacional(produccionBimestral: number, totalPeriodos: number = 6): number[] {
  if (produccionBimestral <= 0) return Array(totalPeriodos).fill(0);
  
  // Factores estacionales de radiación solar en México (primavera/verano mayor que invierno)
  // Índices aproximados para 6 bimestres
  const factores = [1.10, 0.97, 0.88, 1.00, 0.89, 1.10];
  return factores.slice(0, totalPeriodos).map(factor => Math.round(produccionBimestral * factor));
}

/**
 * Calcula el desglose detallado de Retorno de Inversión periodo a periodo con Banco Solar
 */
export function calcularDetalleRetornoInversion(
  consumos: ConsumoPeriodo[],
  produccionBimestral: number,
  nuevoPagoPromedio: number = PAGO_MINIMO_CFE
): { filas: FilaRetornoInversion[]; ahorroAnualTotal: number } {
  // Tomamos los 6 periodos en orden cronológico o inverso según esté capturado
  const produccionesEstacionales = calcularProduccionEstacional(produccionBimestral, consumos.length);
  
  let bancoSolarAcumulado = 0;
  const filas: FilaRetornoInversion[] = [];
  let ahorroAnualTotal = 0;

  for (let i = 0; i < consumos.length; i++) {
    const item = consumos[i];
    const consumoHistorico = Number(item.kwh) || 0;
    const pagoHistorico = Number(item.pago) || 0;
    const energiaGenerada = produccionesEstacionales[i] || Math.round(produccionBimestral);

    // Diferencia: Consumo - Generación
    // Si generó más de lo consumido, la diferencia es negativa (excedente)
    const diferencia = consumoHistorico - energiaGenerada;

    let nuevoConsumo = 0;
    let bancoSolar = 0;
    let nuevoPagoCFE = 0;

    if (diferencia < 0) {
      // Excedente de energía generado
      const excedente = Math.abs(diferencia);
      bancoSolarAcumulado += excedente;
      bancoSolar = bancoSolarAcumulado;
      nuevoConsumo = -bancoSolarAcumulado;
      nuevoPagoCFE = PAGO_MINIMO_CFE;
    } else {
      // Consumió más de lo generado (déficit)
      if (bancoSolarAcumulado >= diferencia) {
        bancoSolarAcumulado -= diferencia;
        bancoSolar = bancoSolarAcumulado;
        nuevoConsumo = -bancoSolarAcumulado;
        nuevoPagoCFE = PAGO_MINIMO_CFE;
      } else {
        const kwhRestantes = diferencia - bancoSolarAcumulado;
        bancoSolarAcumulado = 0;
        bancoSolar = 0;
        nuevoConsumo = kwhRestantes;

        const costoKwhPromedio = consumoHistorico > 0 ? pagoHistorico / consumoHistorico : 2.5;
        nuevoPagoCFE = Math.max(PAGO_MINIMO_CFE, Math.round(kwhRestantes * costoKwhPromedio * 100) / 100);
      }
    }

    // Ahorro del periodo
    const ahorroPeriodo = Math.max(0, pagoHistorico - nuevoPagoCFE);
    ahorroAnualTotal += ahorroPeriodo;

    const periodoStr = item.inicioStr && item.terminoStr
      ? `${item.inicioStr} - ${item.terminoStr}`
      : `Periodo ${i + 1}`;

    filas.push({
      periodo: periodoStr,
      consumoHistorico,
      energiaGenerada,
      diferencia,
      nuevoConsumo,
      bancoSolar,
      nuevoPagoCFE: pagoHistorico > 0 ? nuevoPagoCFE : (produccionBimestral > 0 ? PAGO_MINIMO_CFE : 0),
      pagoHistorico,
      ahorroPeriodo: pagoHistorico > 0 ? ahorroPeriodo : 0,
    });
  }

  return { filas, ahorroAnualTotal };
}

/**
 * Calcula los beneficios ambientales en base a la generación anual
 */
export function calcularBeneficiosAmbientales(produccionBimestral: number, periodo: string = 'Bimestral') {
  const multiplicadorAnual = periodo === 'Bimestral' ? 6 : 12;
  const kwhAnual = produccionBimestral * multiplicadorAnual;

  // Factores oficiales promedio para México:
  // Factor de emisión del Sistema Eléctrico Nacional: ~0.505 kg CO2e / kWh
  const kgCO2 = kwhAnual * 0.505;
  // 1 árbol absorbe en promedio ~20-25 kg CO2 al año
  const arboles = Math.round(kgCO2 * 0.025);
  // Auto estándar emite aprox 0.133 kg CO2/km (1 kg CO2 ~ 3.78 - 7.5 km)
  const kmAuto = kgCO2 * 3.785;

  return {
    kgCO2: Number(kgCO2.toFixed(2)),
    arboles,
    kmAuto: Number(kmAuto.toFixed(2)),
  };
}

/**
 * Calcula la proyección financiera a 5 años (Sin paneles vs Con paneles)
 */
export function calcularProyeccion5Anos(
  pagoPromedioCFE: number,
  nuevoPagoCFE: number,
  granTotalInversion: number,
  periodo: string = 'Bimestral'
) {
  const periodosPorAno = periodo === 'Bimestral' ? 6 : 12;
  const totalPeriodos5Anos = periodosPorAno * 5;
  const tasaInflacionCFE = 0.04; // 4% de aumento anual promedio de tarifa

  let gastoSinPanelesAcum = 0;
  let gastoConPanelesAcum = granTotalInversion;

  const arraySinPaneles: number[] = [0];
  const arrayConPaneles: number[] = [granTotalInversion];

  for (let ano = 1; ano <= 5; ano++) {
    const factorInflacion = Math.pow(1 + tasaInflacionCFE, ano - 1);
    const pagoAnualSinPaneles = pagoPromedioCFE * periodosPorAno * factorInflacion;
    const pagoAnualConPaneles = nuevoPagoCFE * periodosPorAno * factorInflacion;

    gastoSinPanelesAcum += pagoAnualSinPaneles;
    gastoConPanelesAcum += pagoAnualConPaneles;

    arraySinPaneles.push(Math.round(gastoSinPanelesAcum));
    arrayConPaneles.push(Math.round(gastoConPanelesAcum));
  }

  const ahorro5Anos = Math.max(0, gastoSinPanelesAcum - gastoConPanelesAcum);

  return {
    gastoSinPaneles5Anos: Math.round(gastoSinPanelesAcum * 100) / 100,
    gastoConPaneles5Anos: Math.round(gastoConPanelesAcum * 100) / 100,
    ahorro5Anos: Math.round(ahorro5Anos * 100) / 100,
    arraySinPaneles,
    arrayConPaneles,
  };
}

/**
 * Calcula el ROI (tiempo de recuperación) en años y meses
 */
export function calcularROI(inversionTotal: number, ahorroAnual: number): string {
  if (ahorroAnual <= 0 || inversionTotal <= 0) return 'N/A';
  
  const anosDecimal = inversionTotal / ahorroAnual;
  const anos = Math.floor(anosDecimal);
  const meses = Math.round((anosDecimal - anos) * 12);

  if (anos === 0) return `${meses} meses`;
  if (meses === 0) return `${anos} años`;
  return `${anos} años ${meses} meses`;
}

/**
 * Calcula la Tasa Interna de Retorno (TIR) aproximada a 5 años
 */
export function calcularTIR5Anos(inversionTotal: number, ahorroAnual: number): number {
  if (inversionTotal <= 0 || ahorroAnual <= 0) return 0;

  // Flujos de efectivo: [-inversion, ahorro1, ahorro2, ahorro3, ahorro4, ahorro5] con inflación 4%
  const flujos = [-inversionTotal];
  for (let i = 1; i <= 5; i++) {
    flujos.push(ahorroAnual * Math.pow(1.04, i - 1));
  }

  // Método de bisección para encontrar la tasa de descuento que hace VPN = 0
  let min = -0.5;
  let max = 1.0;
  let tir = 0;

  for (let iter = 0; iter < 100; iter++) {
    const r = (min + max) / 2;
    let npv = 0;
    for (let t = 0; t < flujos.length; t++) {
      npv += flujos[t] / Math.pow(1 + r, t);
    }

    if (Math.abs(npv) < 0.01) {
      tir = r;
      break;
    }

    if (npv > 0) {
      min = r;
    } else {
      max = r;
    }
    tir = r;
  }

  return Math.max(0, Number((tir * 100).toFixed(2)));
}
