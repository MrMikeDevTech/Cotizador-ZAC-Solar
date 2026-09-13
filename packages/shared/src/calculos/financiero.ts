export interface Proyeccion5Anos {
  gastoSinPaneles5Anos: number;
  gastoConPaneles5Anos: number;
  ahorro5Anos: number;
  arraySinPaneles: number[];
  arrayConPaneles: number[];
}

/** Proyección financiera a 5 años: gasto acumulado sin paneles vs. con paneles. */
export function calcularProyeccion5Anos(
  pagoPromedioCFE: number,
  nuevoPagoCFE: number,
  granTotalInversion: number,
  periodo: string = 'Bimestral',
  inflacionCfe: number = 0.04
): Proyeccion5Anos {
  const periodosPorAno = periodo === 'Bimestral' ? 6 : 12;

  let gastoSinPanelesAcum = 0;
  let gastoConPanelesAcum = granTotalInversion;

  const arraySinPaneles: number[] = [0];
  const arrayConPaneles: number[] = [granTotalInversion];

  for (let ano = 1; ano <= 5; ano++) {
    const factorInflacion = Math.pow(1 + inflacionCfe, ano - 1);
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

/** Tiempo de recuperación de la inversión (ROI), en años y meses. */
export function calcularROI(inversionTotal: number, ahorroAnual: number): string {
  if (ahorroAnual <= 0 || inversionTotal <= 0) return 'N/A';

  const anosDecimal = inversionTotal / ahorroAnual;
  const anos = Math.floor(anosDecimal);
  const meses = Math.round((anosDecimal - anos) * 12);

  if (anos === 0) return `${meses} meses`;
  if (meses === 0) return `${anos} años`;
  return `${anos} años ${meses} meses`;
}

/** Tasa Interna de Retorno aproximada a 5 años (bisección, inflación 4% anual sobre el ahorro). */
export function calcularTIR5Anos(
  inversionTotal: number,
  ahorroAnual: number,
  inflacionCfe: number = 0.04
): number {
  if (inversionTotal <= 0 || ahorroAnual <= 0) return 0;

  const flujos = [-inversionTotal];
  for (let i = 1; i <= 5; i++) {
    flujos.push(ahorroAnual * Math.pow(1 + inflacionCfe, i - 1));
  }

  let min = -0.5;
  let max = 1.0;
  let tir = 0;

  for (let iter = 0; iter < 100; iter++) {
    const r = (min + max) / 2;
    let npv = 0;
    for (let t = 0; t < flujos.length; t++) {
      npv += flujos[t]! / Math.pow(1 + r, t);
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
