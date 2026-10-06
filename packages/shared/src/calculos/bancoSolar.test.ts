import { describe, expect, test } from 'bun:test';
import { calcularProduccionEstacional, calcularDetalleRetornoInversion } from './bancoSolar.ts';
import { calcularImporteCfe } from './importeCfe.ts';
import type { EscalonTarifa } from './importeCfe.ts';
import type { ConsumoPeriodo } from '../types/dominio.ts';

describe('calcularProduccionEstacional', () => {
  test('aplica los factores estacionales por defecto (paridad calculosConfirmacion.ts L35-42)', () => {
    const resultado = calcularProduccionEstacional(1000, 6);
    expect(resultado).toEqual([1100, 970, 880, 1000, 890, 1100]);
  });

  test('produccion <= 0 devuelve ceros', () => {
    expect(calcularProduccionEstacional(0, 3)).toEqual([0, 0, 0]);
  });
});

describe('calcularDetalleRetornoInversion', () => {
  const consumosFixture: ConsumoPeriodo[] = [
    { inicioStr: 'marzo 2026', terminoStr: 'mayo 2026', kwh: '786', pago: '2110.43' },
    { inicioStr: 'enero 2026', terminoStr: 'marzo 2026', kwh: '582', pago: '1572.20' },
    { inicioStr: 'noviembre 2025', terminoStr: 'enero 2026', kwh: '668', pago: '1955.10' },
    { inicioStr: 'septiembre 2025', terminoStr: 'noviembre 2025', kwh: '896', pago: '2972.96' },
    { inicioStr: 'julio 2025', terminoStr: 'septiembre 2025', kwh: '975', pago: '2903.51' },
    { inicioStr: 'mayo 2025', terminoStr: 'julio 2025', kwh: '861', pago: '2373.56' },
  ];

  test('genera 6 filas y usa el pago mínimo CFE recibido (bug corregido: antes se ignoraba el parámetro)', () => {
    const { filas } = calcularDetalleRetornoInversion(consumosFixture, 998.72, 60);
    expect(filas).toHaveLength(6);
    filas.forEach((fila) => {
      if (fila.bancoSolar > 0 || fila.nuevoConsumo <= 0) {
        expect(fila.nuevoPagoCFE).toBe(60);
      }
    });
  });

  test('con un pagoMinimoCfe distinto, las filas en banco solar lo reflejan', () => {
    const { filas } = calcularDetalleRetornoInversion(consumosFixture, 998.72, 100);
    const filaConBanco = filas.find((f) => f.bancoSolar > 0);
    expect(filaConBanco?.nuevoPagoCFE).toBe(100);
  });

  test('produccion 0 no genera ahorro', () => {
    const { filas } = calcularDetalleRetornoInversion(consumosFixture, 0, 60);
    filas.forEach((fila) => expect(fila.ahorroPeriodo).toBe(0));
  });

  test('sin escalonesPorPeriodo, usoTarifaReal es false y el resultado no cambia (respaldo offline)', () => {
    const sinEscalones = calcularDetalleRetornoInversion(consumosFixture, 998.72, 60);
    expect(sinEscalones.usoTarifaReal).toBe(false);

    const conUndefinedExplicito = calcularDetalleRetornoInversion(consumosFixture, 998.72, 60, undefined, undefined);
    expect(conUndefinedExplicito.filas).toEqual(sinEscalones.filas);
    expect(conUndefinedExplicito.ahorroAnualTotal).toBe(sinEscalones.ahorroAnualTotal);
  });

  describe('con escalonesPorPeriodo (tarifa real de CFE)', () => {
    // Tarifa 1A de verano de ejemplo: básico 100@1.019, intermedio 50@1.183, excedente@4.054.
    const ESCALONES_1A: EscalonTarifa[] = [
      { tierIndex: 0, concept: 'Consumo básico', price: 1.019, limitKwh: 100 },
      { tierIndex: 1, concept: 'Consumo intermedio', price: 1.183, limitKwh: 50 },
      { tierIndex: 2, concept: 'Consumo excedente', price: 4.054, limitKwh: null },
    ];

    // Producción deliberadamente baja (vs. los 998.72 de arriba): con una
    // producción grande el banco solar cubre todo el déficit de estos
    // periodos y nunca se llega a calcular un precio por kWh, dejando estos
    // tests sin cobertura real. Con 200 kWh bimestrales, cada periodo cae en
    // déficit y sí ejercita la rama de precio (calcularImporteCfe o su
    // respaldo lineal).
    const PRODUCCION_BAJA = 200;

    test('usa calcularImporteCfe (no el promedio lineal) cuando hay escalones para el periodo', () => {
      const pagoMinimoCfe = 60;
      const escalonesPorPeriodo = consumosFixture.map(() => ESCALONES_1A);

      const { filas, usoTarifaReal } = calcularDetalleRetornoInversion(
        consumosFixture,
        PRODUCCION_BAJA,
        pagoMinimoCfe,
        undefined,
        escalonesPorPeriodo
      );

      expect(usoTarifaReal).toBe(true);

      filas.forEach((fila, i) => {
        // Solo las filas en déficit (nuevoConsumo > 0, sin banco solar) pasan
        // por calcularImporteCfe; las cubiertas por banco solar siguen en
        // pagoMinimoCfe sin importar los escalones.
        if (fila.bancoSolar === 0 && fila.nuevoConsumo > 0) {
          const esperado = calcularImporteCfe(fila.nuevoConsumo, ESCALONES_1A, pagoMinimoCfe);
          expect(fila.nuevoPagoCFE).toBe(esperado);
        }
      });
    });

    test('un periodo con escalones null cae al respaldo offline para ese periodo y marca usoTarifaReal=false', () => {
      const pagoMinimoCfe = 60;
      const escalonesPorPeriodo: Array<EscalonTarifa[] | null> = consumosFixture.map((_, i) =>
        i === 0 ? null : ESCALONES_1A
      );

      const { usoTarifaReal } = calcularDetalleRetornoInversion(
        consumosFixture,
        PRODUCCION_BAJA,
        pagoMinimoCfe,
        undefined,
        escalonesPorPeriodo
      );

      // Un solo periodo sin escalones basta para que el resultado completo
      // se marque como aproximado.
      expect(usoTarifaReal).toBe(false);
    });

    test('el camino con escalones difiere del respaldo lineal (demuestra el porqué de calcularImporteCfe)', () => {
      const pagoMinimoCfe = 60;
      const escalonesPorPeriodo = consumosFixture.map(() => ESCALONES_1A);

      const conEscalones = calcularDetalleRetornoInversion(
        consumosFixture,
        PRODUCCION_BAJA,
        pagoMinimoCfe,
        undefined,
        escalonesPorPeriodo
      );
      const sinEscalones = calcularDetalleRetornoInversion(consumosFixture, PRODUCCION_BAJA, pagoMinimoCfe);

      // Al menos una fila en déficit debe diferir entre ambos métodos.
      const algunaDifiere = conEscalones.filas.some(
        (fila, i) => fila.nuevoPagoCFE !== sinEscalones.filas[i]!.nuevoPagoCFE
      );
      expect(algunaDifiere).toBe(true);
    });
  });
});
