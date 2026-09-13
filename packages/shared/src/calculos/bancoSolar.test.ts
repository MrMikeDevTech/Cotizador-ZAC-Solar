import { describe, expect, test } from 'bun:test';
import { calcularProduccionEstacional, calcularDetalleRetornoInversion } from './bancoSolar.ts';
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
});
