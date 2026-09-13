import { describe, expect, test } from 'bun:test';
import { calcularBeneficiosAmbientales } from './ambiental.ts';

describe('calcularBeneficiosAmbientales', () => {
  test('paridad con calculosConfirmacion.ts L125-142 (Bimestral x6)', () => {
    const resultado = calcularBeneficiosAmbientales(998.72, 'Bimestral');
    const kwhAnual = 998.72 * 6;
    const kgCO2Esperado = Number((kwhAnual * 0.505).toFixed(2));
    expect(resultado.kgCO2).toBe(kgCO2Esperado);
    expect(resultado.arboles).toBe(Math.round(kgCO2Esperado * 0.025));
  });

  test('Mensual multiplica por 12', () => {
    const bimestral = calcularBeneficiosAmbientales(500, 'Bimestral');
    const mensual = calcularBeneficiosAmbientales(500, 'Mensual');
    expect(mensual.kgCO2).toBeCloseTo(bimestral.kgCO2 * 2, 1);
  });
});
