/**
 * Un escalón de una tarifa doméstica escalonada de CFE (p. ej. 1, 1A-1F).
 *
 * `limitKwh` es la cantidad de kWh que **cubre** ese escalón, no un umbral
 * acumulado: en la tarifa 1A de verano, el escalón "Consumo intermedio" con
 * `limitKwh: 50` cubre los kWh 101-150 (los 50 que siguen al básico), no
 * "hasta 50 kWh". El escalón excedente (el que cobra todo lo que sobra) se
 * marca con `limitKwh: null`.
 */
export interface EscalonTarifa {
  tierIndex: number;
  concept: string;
  price: number; // $/kWh
  limitKwh: number | null; // null = escalón excedente (sin tope)
}

/**
 * Calcula el importe de un recibo de CFE aplicando la tarifa escalonada real,
 * en vez de linealizarla con un costo promedio por kWh (que falla justo cerca
 * de los saltos de escalón, donde más importa por ser donde vive el ahorro
 * solar).
 *
 * Los escalones se procesan en orden de `tierIndex` ascendente, consumiendo
 * el `consumoKwh` escalón por escalón. Nunca devuelve menos que `pagoMinimo`.
 */
export function calcularImporteCfe(consumoKwh: number, escalones: EscalonTarifa[], pagoMinimo: number): number {
  if (consumoKwh <= 0) return pagoMinimo;

  const escalonesOrdenados = [...escalones].sort((a, b) => a.tierIndex - b.tierIndex);

  let restante = consumoKwh;
  let importe = 0;

  for (let i = 0; i < escalonesOrdenados.length; i++) {
    if (restante <= 0) break;

    const escalon = escalonesOrdenados[i]!;
    const esUltimo = i === escalonesOrdenados.length - 1;

    // El escalón excedente (limitKwh null) siempre cobra todo lo restante.
    // Defensivo: si el último escalón no viene marcado como excedente (no
    // debería pasar con datos reales de CFE), también se le carga el
    // sobrante en vez de perderlo.
    const kwhEnEsteEscalon =
      escalon.limitKwh === null || esUltimo ? restante : Math.min(restante, escalon.limitKwh);

    importe += kwhEnEsteEscalon * escalon.price;
    restante -= kwhEnEsteEscalon;
  }

  return Math.max(pagoMinimo, Math.round(importe * 100) / 100);
}
