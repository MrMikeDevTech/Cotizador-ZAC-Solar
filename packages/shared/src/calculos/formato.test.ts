import { describe, expect, test } from 'bun:test';
import { generarCodigoAbreviado, formatearMoneda } from './formato.ts';

describe('generarCodigoAbreviado', () => {
  test('3+ palabras usa iniciales de las primeras 3', () => {
    expect(generarCodigoAbreviado('YARELI RAMIREZ SANTIAGO', '006')).toBe('YRS-006');
  });
  test('2 palabras usa 2 letras + 1 letra', () => {
    expect(generarCodigoAbreviado('Juan Perez', '001')).toBe('JUP-001');
  });
  test('1 palabra usa 3 primeras letras', () => {
    expect(generarCodigoAbreviado('Solar', '001')).toBe('SOL-001');
  });
  test('nombre vacío usa PRJ', () => {
    expect(generarCodigoAbreviado('', '009')).toBe('PRJ-009');
  });
});

describe('formatearMoneda', () => {
  test('formatea con 2 decimales y sufijo de moneda', () => {
    expect(formatearMoneda(2314.6267, 'MXN')).toBe('$2,314.63 MXN');
  });
});
