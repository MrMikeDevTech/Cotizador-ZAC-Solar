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
 * `mesesDelPeriodo` es el dato que hace cuadrar el cálculo con un recibo real:
 * **CFE publica los límites de cada escalón por mes**, así que un recibo
 * bimestral tiene doble cupo antes de llegar al escalón excedente. Ignorarlo
 * mandaba al excedente —el escalón caro, hasta 4x el básico— kWh que todavía
 * tenían cupo barato, y sobrestimaba el recibo alrededor de un 15 %.
 *
 * Verificado contra un recibo real (tarifa 1A verano, julio 2025, 963 kWh
 * bimestrales): con límites mensuales daba $3 292 frente a los $2 850 del
 * recibo; duplicándolos da $2 866, dentro del 1 %.
 *
 * El pago mínimo también es mensual, así que escala igual.
 */
export function calcularImporteCfe(
  consumoKwh: number,
  escalones: EscalonTarifa[],
  pagoMinimo: number,
  mesesDelPeriodo: number = 1
): number {
  const meses = mesesDelPeriodo > 0 ? mesesDelPeriodo : 1;
  const minimo = pagoMinimo * meses;

  if (consumoKwh <= 0) return minimo;

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
      escalon.limitKwh === null || esUltimo
        ? restante
        : Math.min(restante, escalon.limitKwh * meses);

    importe += kwhEnEsteEscalon * escalon.price;
    restante -= kwhEnEsteEscalon;
  }

  return Math.max(minimo, Math.round(importe * 100) / 100);
}

/** Entrada para calcular un recibo de CFE completo (cargo de energía + DAP + IVA). */
export interface EntradaPagoRecibo {
  consumoKwh: number;
  escalones: EscalonTarifa[];
  pagoMinimo: number;
  /** IVA en porcentaje (p. ej. 16 para 16 %). 0 = no aplicar. */
  ivaPct: number;
  /** DAP en porcentaje sobre el cargo de energía. 0 = no aplicar. */
  dapPct: number;
  /** Meses que cubre el recibo (2 en bimestral). Escala límites y mínimo. */
  mesesDelPeriodo?: number;
}

/** Resultado del desglose de un recibo de CFE. */
export interface ResultadoPagoRecibo {
  cargoEnergia: number;
  montoDap: number;
  montoIva: number;
  total: number;
}

/**
 * Calcula el total de un recibo de CFE a partir del consumo en kWh,
 * replicando el orden real en que CFE aplica los cargos en el recibo:
 *
 * 1. Cargo de energía: la tarifa escalonada real (`calcularImporteCfe`),
 *    que ya aplica el piso de `pagoMinimo` sobre el consumo.
 * 2. DAP (Derecho de Alumbrado Público): porcentaje sobre el cargo de
 *    energía ya resuelto (incluyendo el mínimo, si aplicó).
 * 3. IVA: se calcula sobre el subtotal de energía + DAP, NO solo sobre la
 *    energía, porque así lo factura CFE: el DAP es un derecho municipal que
 *    se traslada al usuario dentro del mismo recibo y el IVA grava ese
 *    subtotal completo, no cada concepto por separado.
 *
 * El pago mínimo se aplica únicamente al cargo de energía (paso 1), antes
 * de DAP e IVA: nunca se "redondea hacia arriba" el total ya con impuestos.
 */
export function calcularPagoRecibo(entrada: EntradaPagoRecibo): ResultadoPagoRecibo {
  const { consumoKwh, escalones, pagoMinimo, ivaPct, dapPct, mesesDelPeriodo } = entrada;

  const cargoEnergia = calcularImporteCfe(consumoKwh, escalones, pagoMinimo, mesesDelPeriodo);
  const montoDap = cargoEnergia * (dapPct / 100);
  const montoIva = (cargoEnergia + montoDap) * (ivaPct / 100);
  const total = Math.round((cargoEnergia + montoDap + montoIva) * 100) / 100;

  return { cargoEnergia, montoDap, montoIva, total };
}
