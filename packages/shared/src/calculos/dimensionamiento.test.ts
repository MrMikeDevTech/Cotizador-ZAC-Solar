import { describe, expect, test } from 'bun:test';
import { calcularPromedios, calcularDimensionamiento } from './dimensionamiento.ts';
import { FACTORES_CALCULO_DEFECTO } from '../seed/catalogosIniciales.ts';
import type { ConsumoPeriodo } from '../types/dominio.ts';

// Fixture real de nuevo/pruebas/page.tsx (contacto YARELI RAMIREZ SANTIAGO)
const consumosFixture: ConsumoPeriodo[] = [
  { inicioStr: 'marzo 2026', terminoStr: 'mayo 2026', kwh: '786', pago: '2110.43' },
  { inicioStr: 'enero 2026', terminoStr: 'marzo 2026', kwh: '582', pago: '1572.20' },
  { inicioStr: 'noviembre 2025', terminoStr: 'enero 2026', kwh: '668', pago: '1955.10' },
  { inicioStr: 'septiembre 2025', terminoStr: 'noviembre 2025', kwh: '896', pago: '2972.96' },
  { inicioStr: 'julio 2025', terminoStr: 'septiembre 2025', kwh: '975', pago: '2903.51' },
  { inicioStr: 'mayo 2025', terminoStr: 'julio 2025', kwh: '861', pago: '2373.56' },
];

describe('calcularPromedios', () => {
  test('promedia los 6 periodos (paridad con page.tsx L91-99)', () => {
    const { consumoPromedioKwh, pagoPromedioCFE } = calcularPromedios(consumosFixture);
    expect(consumoPromedioKwh).toBeCloseTo(794.6667, 3);
    expect(pagoPromedioCFE).toBeCloseTo(2314.6267, 3);
  });

  test('evita división por cero devolviendo 1', () => {
    const vacios: ConsumoPeriodo[] = Array.from({ length: 6 }, () => ({ inicioStr: '', terminoStr: '', kwh: '', pago: '' }));
    expect(calcularPromedios(vacios).consumoPromedioKwh).toBe(1);
    expect(calcularPromedios(vacios).pagoPromedioCFE).toBe(0);
  });
});

describe('calcularDimensionamiento', () => {
  const panel = { watts: 615, factorBifacial: 1.0 };
  const { consumoPromedioKwh, pagoPromedioCFE } = calcularPromedios(consumosFixture);

  test('paridad con page.tsx L102-138: 7 paneles jinko_615', () => {
    const resultado = calcularDimensionamiento({
      panel,
      cantPaneles: 7,
      consumoPromedioKwh,
      pagoPromedioCFE,
      factores: FACTORES_CALCULO_DEFECTO,
    });

    expect(resultado.tamanoSistema).toBe(7 * 615 * 1.0);
    expect(resultado.produccion).toBeCloseTo(7 * 615 * 1.0 * 0.24725, 5);
    // autoconsumo > 100% -> nuevoPago = pago mínimo CFE, ahorro = promedio - mínimo
    expect(resultado.autoconsumo).toBeGreaterThan(100);
    expect(resultado.nuevoPago).toBe(60);
    expect(resultado.ahorro).toBeCloseTo(pagoPromedioCFE - 60, 5);
  });

  test('sin panel seleccionado devuelve todo en cero', () => {
    const resultado = calcularDimensionamiento({
      panel: undefined,
      cantPaneles: 5,
      consumoPromedioKwh,
      pagoPromedioCFE,
      factores: FACTORES_CALCULO_DEFECTO,
    });
    expect(resultado).toEqual({ tamanoSistema: 0, produccion: 0, autoconsumo: 0, nuevoPago: 0, ahorro: 0 });
  });

  test('autoconsumo parcial (<100%) interpola el nuevo pago', () => {
    const resultado = calcularDimensionamiento({
      panel,
      cantPaneles: 2,
      consumoPromedioKwh,
      pagoPromedioCFE,
      factores: FACTORES_CALCULO_DEFECTO,
    });
    expect(resultado.autoconsumo).toBeLessThan(100);
    const esperadoNuevoPago =
      (1 - resultado.autoconsumo / 100) * (pagoPromedioCFE - 60) + 60;
    expect(resultado.nuevoPago).toBeCloseTo(esperadoNuevoPago, 5);
    expect(resultado.ahorro).toBeCloseTo(pagoPromedioCFE - esperadoNuevoPago, 5);
  });

  test('cantidad 0 no genera ahorro', () => {
    const resultado = calcularDimensionamiento({
      panel,
      cantPaneles: 0,
      consumoPromedioKwh,
      pagoPromedioCFE,
      factores: FACTORES_CALCULO_DEFECTO,
    });
    expect(resultado.nuevoPago).toBe(0);
    expect(resultado.ahorro).toBe(0);
  });
});
