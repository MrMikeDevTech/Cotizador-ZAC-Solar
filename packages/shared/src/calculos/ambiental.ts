export interface BeneficiosAmbientales {
  kgCO2: number;
  arboles: number;
  kmAuto: number;
}

/** Beneficios ambientales estimados a partir de la generación anual. */
export function calcularBeneficiosAmbientales(
  produccionBimestral: number,
  periodo: string = 'Bimestral',
  factorCo2: number = 0.505,
  factorArboles: number = 0.025,
  factorKmAuto: number = 3.785
): BeneficiosAmbientales {
  const multiplicadorAnual = periodo === 'Bimestral' ? 6 : 12;
  const kwhAnual = produccionBimestral * multiplicadorAnual;

  const kgCO2 = kwhAnual * factorCo2;
  const arboles = Math.round(kgCO2 * factorArboles);
  const kmAuto = kgCO2 * factorKmAuto;

  return {
    kgCO2: Number(kgCO2.toFixed(2)),
    arboles,
    kmAuto: Number(kmAuto.toFixed(2)),
  };
}
