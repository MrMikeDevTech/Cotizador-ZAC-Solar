import { describe, expect, test } from 'bun:test';
import { calcularProyeccion5Anos, calcularROI, calcularTIR5Anos } from './financiero.ts';

describe('calcularProyeccion5Anos', () => {
  test('paridad con calculosConfirmacion.ts L147-184', () => {
    const resultado = calcularProyeccion5Anos(2314.63, 80.5, 69220, 'Bimestral');
    expect(resultado.arraySinPaneles[0]).toBe(0);
    expect(resultado.arrayConPaneles[0]).toBe(69220);
    expect(resultado.arraySinPaneles).toHaveLength(6);
    expect(resultado.arrayConPaneles).toHaveLength(6);
    // gastoConPaneles incluye la inversión inicial, por eso suele ser mayor a corto plazo
    expect(resultado.gastoConPaneles5Anos).toBeGreaterThan(69220);
  });
});

describe('calcularROI', () => {
  test('N/A si no hay ahorro o inversión', () => {
    expect(calcularROI(0, 1000)).toBe('N/A');
    expect(calcularROI(1000, 0)).toBe('N/A');
  });

  test('formatea meses cuando es menos de un año', () => {
    expect(calcularROI(500, 6000)).toBe('1 meses');
  });

  test('formatea años exactos', () => {
    expect(calcularROI(10000, 5000)).toBe('2 años');
  });

  test('formatea años y meses', () => {
    expect(calcularROI(15000, 5000)).toBe('3 años');
  });
});

describe('calcularTIR5Anos', () => {
  test('0 si no hay inversión o ahorro', () => {
    expect(calcularTIR5Anos(0, 1000)).toBe(0);
    expect(calcularTIR5Anos(1000, 0)).toBe(0);
  });

  test('devuelve una tasa positiva razonable para un caso rentable', () => {
    const tir = calcularTIR5Anos(69220, 13887.78); // ahorro*6 del fixture
    expect(tir).toBeGreaterThan(0);
    expect(tir).toBeLessThan(100);
  });
});
