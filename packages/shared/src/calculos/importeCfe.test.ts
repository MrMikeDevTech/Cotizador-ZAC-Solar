import { describe, expect, test } from 'bun:test';
import { calcularImporteCfe } from './importeCfe.ts';
import type { EscalonTarifa } from './importeCfe.ts';

// Tarifa 1A de verano (ejemplo real verificado contra CFE):
// - Consumo básico: primeros 100 kWh a 1.019
// - Consumo intermedio: siguientes 50 kWh (101-150) a 1.183
// - Consumo excedente: todo lo que sobre, a 4.054
const ESCALONES_1A: EscalonTarifa[] = [
  { tierIndex: 0, concept: 'Consumo básico', price: 1.019, limitKwh: 100 },
  { tierIndex: 1, concept: 'Consumo intermedio', price: 1.183, limitKwh: 50 },
  { tierIndex: 2, concept: 'Consumo excedente', price: 4.054, limitKwh: null },
];

const PAGO_MINIMO = 60;

describe('calcularImporteCfe', () => {
  test('consumo que cae justo en el primer salto de escalón (100 kWh exactos)', () => {
    // Se agota exactamente el escalón básico; no debe tocar el intermedio.
    const importe = calcularImporteCfe(100, ESCALONES_1A, PAGO_MINIMO);
    expect(importe).toBe(101.9); // 100 * 1.019
  });

  test('consumo que cae justo en el segundo salto de escalón (150 kWh exactos)', () => {
    // Se agotan básico + intermedio exactos; no debe tocar el excedente.
    const importe = calcularImporteCfe(150, ESCALONES_1A, PAGO_MINIMO);
    expect(importe).toBe(161.05); // 100*1.019 + 50*1.183
  });

  test('un kWh más allá del salto ya cobra el siguiente escalón', () => {
    const importe101 = calcularImporteCfe(101, ESCALONES_1A, PAGO_MINIMO);
    expect(importe101).toBe(Math.round((100 * 1.019 + 1 * 1.183) * 100) / 100);

    const importe151 = calcularImporteCfe(151, ESCALONES_1A, PAGO_MINIMO);
    expect(importe151).toBe(Math.round((100 * 1.019 + 50 * 1.183 + 1 * 4.054) * 100) / 100);
  });

  test('consumo menor que el primer escalón solo cobra el precio básico', () => {
    const importe = calcularImporteCfe(60, ESCALONES_1A, PAGO_MINIMO);
    expect(importe).toBe(61.14); // 60*1.019, no toca el escalón intermedio
  });

  test('consumo que desborda al escalón excedente', () => {
    // 100 a 1.019, 50 a 1.183, 50 (200-150) a 4.054
    const importe = calcularImporteCfe(200, ESCALONES_1A, PAGO_MINIMO);
    const esperado = Math.round((100 * 1.019 + 50 * 1.183 + 50 * 4.054) * 100) / 100;
    expect(importe).toBe(esperado);
  });

  test('consumo 0 devuelve el pago mínimo', () => {
    expect(calcularImporteCfe(0, ESCALONES_1A, PAGO_MINIMO)).toBe(PAGO_MINIMO);
  });

  test('consumo negativo devuelve el pago mínimo', () => {
    expect(calcularImporteCfe(-50, ESCALONES_1A, PAGO_MINIMO)).toBe(PAGO_MINIMO);
  });

  test('el importe nunca baja del pago mínimo aunque el consumo escalonado sea menor', () => {
    // 5 kWh * 1.019 = 5.095, muy por debajo de un pago mínimo de 60.
    const importe = calcularImporteCfe(5, ESCALONES_1A, 60);
    expect(importe).toBe(60);
  });

  test('tarifa de 4 escalones (1C-1F: básico, intermedio bajo, intermedio alto, excedente)', () => {
    const escalones4: EscalonTarifa[] = [
      { tierIndex: 0, concept: 'Consumo básico', price: 0.5, limitKwh: 100 },
      { tierIndex: 1, concept: 'Consumo intermedio bajo', price: 1.0, limitKwh: 100 },
      { tierIndex: 2, concept: 'Consumo intermedio alto', price: 1.5, limitKwh: 100 },
      { tierIndex: 3, concept: 'Consumo excedente', price: 2.0, limitKwh: null },
    ];

    // 250 kWh: 100@0.5 + 100@1.0 + 50@1.5 (no llega al excedente)
    const importe250 = calcularImporteCfe(250, escalones4, PAGO_MINIMO);
    expect(importe250).toBe(100 * 0.5 + 100 * 1.0 + 50 * 1.5);

    // 350 kWh: agota los tres primeros y mete 50 kWh al excedente
    const importe350 = calcularImporteCfe(350, escalones4, PAGO_MINIMO);
    expect(importe350).toBe(100 * 0.5 + 100 * 1.0 + 100 * 1.5 + 50 * 2.0);
  });

  test('escalones desordenados en el array producen el mismo resultado (se ordenan por tierIndex)', () => {
    const desordenados: EscalonTarifa[] = [
      { tierIndex: 2, concept: 'Consumo excedente', price: 4.054, limitKwh: null },
      { tierIndex: 0, concept: 'Consumo básico', price: 1.019, limitKwh: 100 },
      { tierIndex: 1, concept: 'Consumo intermedio', price: 1.183, limitKwh: 50 },
    ];

    const importeOrdenado = calcularImporteCfe(180, ESCALONES_1A, PAGO_MINIMO);
    const importeDesordenado = calcularImporteCfe(180, desordenados, PAGO_MINIMO);
    expect(importeDesordenado).toBe(importeOrdenado);
    expect(importeOrdenado).toBe(Math.round((100 * 1.019 + 50 * 1.183 + 30 * 4.054) * 100) / 100);
  });

  test('sin escalón excedente, el sobrante se cobra al precio del último escalón (defensivo)', () => {
    const sinExcedente: EscalonTarifa[] = [
      { tierIndex: 0, concept: 'Consumo básico', price: 1.0, limitKwh: 100 },
      { tierIndex: 1, concept: 'Consumo intermedio', price: 2.0, limitKwh: 50 },
    ];
    // 200 kWh: 100@1.0 + 50@2.0 + 50 sobrantes al precio del último (2.0)
    const importe = calcularImporteCfe(200, sinExcedente, PAGO_MINIMO);
    expect(importe).toBe(100 * 1.0 + 50 * 2.0 + 50 * 2.0);
  });

  test(
    'difiere del método lineal viejo (pagoHistorico/consumoHistorico) cerca de un salto de escalón: ' +
      'el ahorro solar baja el consumo justo a través de los saltos, y promediar el costo de un ' +
      'consumo histórico alto sobreestima brutalmente el costo de un consumo nuevo mucho menor',
    () => {
      // Historial: 300 kWh que cruzan los tres escalones completos.
      const consumoHistorico = 300;
      const pagoHistorico = calcularImporteCfe(consumoHistorico, ESCALONES_1A, PAGO_MINIMO);
      expect(pagoHistorico).toBe(
        Math.round((100 * 1.019 + 50 * 1.183 + 150 * 4.054) * 100) / 100
      ); // 769.15

      // Con paneles, el nuevo consumo cae a 110 kWh: apenas entra al escalón
      // intermedio (barato), muy lejos del excedente que encareció el histórico.
      const nuevoConsumo = 110;

      const costoKwhPromedioViejo = pagoHistorico / consumoHistorico;
      const importeLinealViejo = Math.round(nuevoConsumo * costoKwhPromedioViejo * 100) / 100;

      const importeReal = calcularImporteCfe(nuevoConsumo, ESCALONES_1A, PAGO_MINIMO);
      expect(importeReal).toBe(Math.round((100 * 1.019 + 10 * 1.183) * 100) / 100); // 113.73

      // El método lineal viejo sobreestima el recibo nuevo por un amplio margen
      // porque arrastra el precio del excedente (4.054) del histórico hacia un
      // consumo que ya no lo alcanza.
      expect(importeLinealViejo).toBeGreaterThan(importeReal * 2);
    }
  );
});
