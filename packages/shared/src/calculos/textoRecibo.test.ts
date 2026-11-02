import { describe, expect, test } from 'bun:test';
import { estadosMexico } from '../seed/catalogosIniciales.ts';
import { aTitulo, distanciaEdicion, expandirEstado, limpiarLineas, limpiarTexto } from './textoRecibo.ts';

describe('limpiarTexto / limpiarLineas', () => {
  test('quita saltos de línea, tabuladores y espacios dobles', () => {
    expect(limpiarTexto('  CALLE   REFORMA\n 120\t COL  CENTRO ')).toBe('CALLE REFORMA 120 COL CENTRO');
  });

  test('limpiarLineas descarta las vacías y colapsa cada una', () => {
    expect(limpiarLineas('A   B\r\n\r\n  C  \n')).toEqual(['A B', 'C']);
  });
});

describe('aTitulo', () => {
  test('mayúsculas a Title Case respetando partículas', () => {
    expect(aTitulo('MORENO ALVARADO MARTIN')).toBe('Moreno Alvarado Martin');
    expect(aTitulo('IXTAPA DE LA CONCEPCION')).toBe('Ixtapa de la Concepcion');
    expect(aTitulo('  de la  cruz ')).toBe('De la Cruz');
  });
});

describe('expandirEstado', () => {
  test.each([
    ['NAY.', 'Nayarit'],
    ['nay', 'Nayarit'],
    ['JAL.', 'Jalisco'],
    ['N.L.', 'Nuevo León'],
    ['S.L.P.', 'San Luis Potosí'],
    ['Q. ROO', 'Quintana Roo'],
    ['MEX.', 'Estado de México'],
    ['CDMX', 'Ciudad de México'],
    ['B.C.S.', 'Baja California Sur'],
    ['Michoacan', 'Michoacán'],
    ['TAMPS.', 'Tamaulipas'],
  ])('%s → %s', (abreviatura, esperado) => {
    expect(expandirEstado(abreviatura)).toBe(esperado);
  });

  test('un estado desconocido da null, no un valor inventado', () => {
    expect(expandirEstado('XYZ.')).toBeNull();
  });

  test('todo valor devuelto existe en estadosMexico', () => {
    for (const abreviatura of ['AGS', 'BC', 'CAMP', 'CHIS', 'CHIH', 'COAH', 'COL', 'DGO', 'GTO', 'GRO', 'HGO', 'MICH', 'MOR', 'OAX', 'PUE', 'QRO', 'SIN', 'SON', 'TAB', 'TLAX', 'VER', 'YUC', 'ZAC']) {
      expect(estadosMexico).toContain(expandirEstado(abreviatura)!);
    }
  });
});

describe('distanciaEdicion', () => {
  test('cuenta ediciones', () => {
    expect(distanciaEdicion('IXTAPA', 'SXTAPA')).toBe(1);
    expect(distanciaEdicion('TEPIC', 'TEPIC')).toBe(0);
    expect(distanciaEdicion('ABC', '')).toBe(3);
  });
});
