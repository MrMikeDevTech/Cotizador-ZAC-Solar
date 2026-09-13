import { describe, expect, test } from 'bun:test';
import { calcularTotalesCotizacion, convertirMoneda } from './cotizacion.ts';
import type { ConceptoCotizacion, CargoEditable } from '../types/dominio.ts';

// Fixture real de nuevo/pruebas/page.tsx — debe dar granTotal = 69220
const conceptosFixture: ConceptoCotizacion[] = [
  { id: '1', concepto: 'Precio de paneles', costoBase: 30800, margenPorcentaje: 0 },
  { id: '2', concepto: 'Precio de inversores', costoBase: 13500, margenPorcentaje: 0 },
  { id: '3', concepto: 'Precio material eléctrico', costoBase: 8120, margenPorcentaje: 0 },
  { id: '4', concepto: 'Mano de obra', costoBase: 8400, margenPorcentaje: 0 },
];
const precioEstructuraFixture = 8400; // 'angulo'

describe('calcularTotalesCotizacion', () => {
  test('paridad con el fixture golden (granTotal = 69220)', () => {
    const resultado = calcularTotalesCotizacion({
      conceptos: conceptosFixture,
      cargosEditables: [],
      precioEstructura: precioEstructuraFixture,
      descuento5: false,
      descuento10: false,
      incluirIva: false,
      ivaPorcentaje: 16,
    });

    expect(resultado.subtotalConceptos).toBe(30800 + 13500 + 8120 + 8400);
    expect(resultado.subtotalGeneral).toBe(69220);
    expect(resultado.subtotalConDescuento).toBe(69220);
    expect(resultado.granTotal).toBe(69220);
  });

  test('descuentos 5% y 10% son aditivos (paridad con page.tsx L198-200)', () => {
    const resultado = calcularTotalesCotizacion({
      conceptos: [{ id: '1', concepto: 'x', costoBase: 1000, margenPorcentaje: 0 }],
      cargosEditables: [],
      precioEstructura: 0,
      descuento5: true,
      descuento10: true,
      incluirIva: false,
      ivaPorcentaje: 16,
    });
    expect(resultado.porcentajeDescuento).toBe(15);
    expect(resultado.montoDescuento).toBe(150);
    expect(resultado.subtotalConDescuento).toBe(850);
  });

  test('IVA se aplica sobre el subtotal con descuento', () => {
    const resultado = calcularTotalesCotizacion({
      conceptos: [{ id: '1', concepto: 'x', costoBase: 1000, margenPorcentaje: 0 }],
      cargosEditables: [],
      precioEstructura: 0,
      descuento5: false,
      descuento10: false,
      incluirIva: true,
      ivaPorcentaje: 16,
    });
    expect(resultado.montoIVA).toBe(160);
    expect(resultado.granTotal).toBe(1160);
  });

  test('utilidad total y porcentaje de utilidad (paridad Paso4OtrosCargos L164-174)', () => {
    const conceptos: ConceptoCotizacion[] = [
      { id: '1', concepto: 'x', costoBase: 1000, margenPorcentaje: 20 },
    ];
    const resultado = calcularTotalesCotizacion({
      conceptos,
      cargosEditables: [],
      precioEstructura: 0,
      descuento5: false,
      descuento10: false,
      incluirIva: false,
      ivaPorcentaje: 16,
    });
    expect(resultado.utilidadTotalMXN).toBe(200);
    expect(resultado.porcentajeUtilidadTotal).toBeCloseTo(16.666, 2);
  });

  test('cargos editables suman al subtotal general', () => {
    const cargos: CargoEditable[] = [{ id: 'a', nombre: 'Viáticos', monto: 500 }];
    const resultado = calcularTotalesCotizacion({
      conceptos: [],
      cargosEditables: cargos,
      precioEstructura: 0,
      descuento5: false,
      descuento10: false,
      incluirIva: false,
      ivaPorcentaje: 16,
    });
    expect(resultado.subtotalCargosEditables).toBe(500);
    expect(resultado.subtotalGeneral).toBe(500);
  });
});

describe('convertirMoneda', () => {
  test('MXN no convierte', () => {
    expect(convertirMoneda(1690, 'MXN', 16.9)).toBe(1690);
  });
  test('USD divide entre el tipo de cambio', () => {
    expect(convertirMoneda(1690, 'USD', 16.9)).toBeCloseTo(100, 5);
  });
});
