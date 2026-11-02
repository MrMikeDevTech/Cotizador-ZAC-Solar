import { describe, expect, test } from 'bun:test';
import { camposFaltantesCartaPoder, fechaCartaPoder, type DatosCartaPoder } from './cartaPoder.ts';

const completos: DatosCartaPoder = {
  nombreApoderado: 'Ana Pérez',
  nombreCliente: 'Juan López',
  direccionCompleta: 'Calle Reforma 120, Tepic, Nayarit',
  codigoPostal: '63000',
  numeroServicio: '123456789012',
  numeroMedidor: 'AB12CD',
};

describe('camposFaltantesCartaPoder', () => {
  test('con todos los datos no falta nada', () => {
    expect(camposFaltantesCartaPoder(completos)).toEqual([]);
  });

  test('vacíos y solo espacios cuentan como faltantes', () => {
    expect(
      camposFaltantesCartaPoder({ ...completos, codigoPostal: '', numeroMedidor: '   ' })
    ).toEqual(['codigoPostal', 'numeroMedidor']);
  });
});

describe('fechaCartaPoder', () => {
  test('usa el formato de la plantilla', () => {
    expect(fechaCartaPoder(new Date(2025, 2, 12))).toBe('12 de Marzo del 2025');
  });
});
