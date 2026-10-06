import type { ConsumoPeriodo, FilaRetornoInversion } from '../types/dominio.ts';
import { calcularImporteCfe } from './importeCfe.ts';
import type { EscalonTarifa } from './importeCfe.ts';

/** Producción estimada por periodo aplicando variaciones estacionales típicas de México. */
export function calcularProduccionEstacional(
  produccionBimestral: number,
  totalPeriodos: number = 6,
  factoresEstacionales: number[] = [1.10, 0.97, 0.88, 1.00, 0.89, 1.10]
): number[] {
  if (produccionBimestral <= 0) return Array(totalPeriodos).fill(0);
  return factoresEstacionales.slice(0, totalPeriodos).map((factor) => Math.round(produccionBimestral * factor));
}

/** Desglose periodo a periodo de retorno de inversión con modelo de Banco Solar. */
export function calcularDetalleRetornoInversion(
  consumos: ConsumoPeriodo[],
  produccionBimestral: number,
  pagoMinimoCfe: number,
  factoresEstacionales?: number[],
  /**
   * Escalones de la tarifa real de CFE por periodo, alineados por índice con
   * `consumos`. Si para un periodo no hay escalones (`null` o arreglo
   * ausente), ese periodo recurre al respaldo offline (promedio
   * pago/consumo histórico), tal como se calculaba antes.
   */
  escalonesPorPeriodo?: Array<EscalonTarifa[] | null>
): { filas: FilaRetornoInversion[]; ahorroAnualTotal: number; usoTarifaReal: boolean } {
  const produccionesEstacionales = calcularProduccionEstacional(
    produccionBimestral,
    consumos.length,
    factoresEstacionales
  );

  let bancoSolarAcumulado = 0;
  const filas: FilaRetornoInversion[] = [];
  let ahorroAnualTotal = 0;
  // Verdadero solo si, para cada periodo donde hizo falta calcular un precio
  // (el banco solar no cubrió todo el consumo), hubo escalones reales
  // disponibles. Un solo periodo sin escalones basta para marcar el
  // resultado completo como aproximado.
  let usoTarifaReal = escalonesPorPeriodo !== undefined;

  for (let i = 0; i < consumos.length; i++) {
    const item = consumos[i]!;
    const consumoHistorico = Number(item.kwh) || 0;
    const pagoHistorico = Number(item.pago) || 0;
    const energiaGenerada = produccionesEstacionales[i] || Math.round(produccionBimestral);

    const diferencia = consumoHistorico - energiaGenerada;

    let nuevoConsumo = 0;
    let bancoSolar = 0;
    let nuevoPagoCFE = 0;

    if (diferencia < 0) {
      const excedente = Math.abs(diferencia);
      bancoSolarAcumulado += excedente;
      bancoSolar = bancoSolarAcumulado;
      nuevoConsumo = -bancoSolarAcumulado;
      nuevoPagoCFE = pagoMinimoCfe;
    } else {
      if (bancoSolarAcumulado >= diferencia) {
        bancoSolarAcumulado -= diferencia;
        bancoSolar = bancoSolarAcumulado;
        nuevoConsumo = -bancoSolarAcumulado;
        nuevoPagoCFE = pagoMinimoCfe;
      } else {
        const kwhRestantes = diferencia - bancoSolarAcumulado;
        bancoSolarAcumulado = 0;
        bancoSolar = 0;
        nuevoConsumo = kwhRestantes;

        const escalones = escalonesPorPeriodo?.[i];
        if (escalones) {
          nuevoPagoCFE = calcularImporteCfe(kwhRestantes, escalones, pagoMinimoCfe);
        } else {
          usoTarifaReal = false;
          const costoKwhPromedio = consumoHistorico > 0 ? pagoHistorico / consumoHistorico : 2.5;
          nuevoPagoCFE = Math.max(pagoMinimoCfe, Math.round(kwhRestantes * costoKwhPromedio * 100) / 100);
        }
      }
    }

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
      nuevoPagoCFE: pagoHistorico > 0 ? nuevoPagoCFE : (produccionBimestral > 0 ? pagoMinimoCfe : 0),
      pagoHistorico,
      ahorroPeriodo: pagoHistorico > 0 ? ahorroPeriodo : 0,
    });
  }

  return { filas, ahorroAnualTotal, usoTarifaReal };
}
