import { describe, expect, test } from 'bun:test';
import { CONCEPTOS_COTIZACION_DEFECTO as DEFECTO_WIZARD } from '../constants';
import { esConceptoDeInversores, esConceptoDePaneles, precioBasePorPanel } from './conceptosEquipo.ts';

describe('conceptos de equipo', () => {
  test('proyecto nuevo: se reconocen por id de plantilla', () => {
    expect(esConceptoDePaneles({ id: '1', concepto: 'Lo que sea' })).toBe(true);
    expect(esConceptoDeInversores({ id: '2', concepto: 'Lo que sea' })).toBe(true);
  });

  test('proyecto reabierto: id uuid, se reconocen por nombre', () => {
    const uuid = '0b9c6c1e-5f7a-4f43-9b3e-1a2b3c4d5e6f';
    expect(esConceptoDePaneles({ id: uuid, concepto: 'Precio de paneles' })).toBe(true);
    expect(esConceptoDeInversores({ id: uuid, concepto: ' precio  de INVERSORES ' })).toBe(true);
  });

  test('no confunde paneles con inversores ni con otros conceptos', () => {
    const uuid = '0b9c6c1e-5f7a-4f43-9b3e-1a2b3c4d5e6f';
    expect(esConceptoDePaneles({ id: uuid, concepto: 'Precio de inversores' })).toBe(false);
    expect(esConceptoDeInversores({ id: uuid, concepto: 'Precio de paneles' })).toBe(false);
    expect(esConceptoDePaneles({ id: uuid, concepto: 'Soporte para paneles' })).toBe(false);
    expect(esConceptoDePaneles({ id: '3', concepto: 'Mano de obra' })).toBe(false);
  });
});

describe('conceptos que se cobran por panel', () => {
  const uuid = '0b9c6c1e-5f7a-4f43-9b3e-1a2b3c4d5e6f';

  test('precios base por panel: eléctrico 1,090, mano de obra 950, estructura de aluminio 1,050', () => {
    expect(precioBasePorPanel({ id: '3', concepto: 'Precio material eléctrico' })).toBe(1090);
    expect(precioBasePorPanel({ id: '4', concepto: 'Mano de obra' })).toBe(950);
    expect(precioBasePorPanel({ id: '5', concepto: 'Estructura de aluminio' })).toBe(1050);
  });

  test('en un proyecto reabierto (ids uuid) se reconocen por nombre', () => {
    expect(precioBasePorPanel({ id: uuid, concepto: 'Mano de obra' })).toBe(950);
    expect(precioBasePorPanel({ id: uuid, concepto: ' estructura  de ALUMINIO' })).toBe(1050);
  });

  test('paneles, inversores y conceptos ajenos no son por panel', () => {
    expect(precioBasePorPanel({ id: '1', concepto: 'Precio de paneles' })).toBeNull();
    expect(precioBasePorPanel({ id: '2', concepto: 'Precio de inversores' })).toBeNull();
    expect(precioBasePorPanel({ id: uuid, concepto: 'Flete' })).toBeNull();
  });

  test('los conceptos por defecto del wizard incluyen la estructura de aluminio, con el precio de un panel', () => {
    const porNombre = Object.fromEntries(DEFECTO_WIZARD.map((c) => [c.concepto, c.costoBase]));
    expect(porNombre['Precio material eléctrico']).toBe(1090);
    expect(porNombre['Mano de obra']).toBe(950);
    expect(porNombre['Estructura de aluminio']).toBe(1050);
  });
});
