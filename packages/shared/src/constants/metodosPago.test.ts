import { describe, expect, test } from 'bun:test';
import {
  METODOS_PAGO,
  METODO_PAGO_POR_DEFECTO,
  esMetodoPagoPredefinido,
  normalizarMetodoPago,
} from './metodosPago.ts';

describe('métodos de pago', () => {
  test('el valor por defecto es la primera opción', () => {
    expect(METODO_PAGO_POR_DEFECTO).toBe('Contado / Transferencia');
    expect(METODOS_PAGO).toHaveLength(5);
  });

  test('"Contado" (valor antiguo) y los vacíos se unifican con el valor por defecto', () => {
    expect(normalizarMetodoPago('Contado')).toBe(METODO_PAGO_POR_DEFECTO);
    expect(normalizarMetodoPago(' contado ')).toBe(METODO_PAGO_POR_DEFECTO);
    expect(normalizarMetodoPago('')).toBe(METODO_PAGO_POR_DEFECTO);
    expect(normalizarMetodoPago(undefined)).toBe(METODO_PAGO_POR_DEFECTO);
  });

  test('un texto personalizado se conserva tal cual (sin espacios sobrantes)', () => {
    expect(normalizarMetodoPago('  30% hoy, resto a 90 días ')).toBe('30% hoy, resto a 90 días');
    expect(esMetodoPagoPredefinido('30% hoy, resto a 90 días')).toBe(false);
    expect(esMetodoPagoPredefinido('Financiamiento Solar')).toBe(true);
  });
});
