import { describe, expect, test } from 'bun:test';
import { separarMarcaYModelo } from './equipo.ts';
import {
  TIPO_EQUIPO_INVERSOR_POR_DEFECTO,
  equipoSeleccionadoSchema,
  normalizarTipoEquipoInversor,
} from '../schemas/proyecto.ts';
import { INVERSORES_INICIALES, PANELES_INICIALES } from '../seed/catalogosIniciales.ts';

describe('separarMarcaYModelo', () => {
  test.each([
    ['Growatt, MIN 2500TL - X2', 'Growatt', 'MIN 2500TL - X2'],
    ['Jinko, JKM615N-78HL4-V.', 'Jinko', 'JKM615N-78HL4-V'],
    ['Canadian Solar, CS6.2-66TB-620- Bifacial al 10%.', 'Canadian Solar', 'CS6.2-66TB-620- Bifacial al 10%'],
    ['  Growatt ,   NEO 2500M - X2 ', 'Growatt', 'NEO 2500M - X2'],
  ])('%s', (nombre, marca, modelo) => {
    expect(separarMarcaYModelo(nombre)).toEqual({ marca, modelo });
  });

  test('solo corta en la PRIMERA coma', () => {
    expect(separarMarcaYModelo('Marca, Modelo, versión 2')).toEqual({ marca: 'Marca', modelo: 'Modelo, versión 2' });
  });

  test('sin coma no inventa una marca: queda vacía y el nombre va como modelo', () => {
    expect(separarMarcaYModelo('Inversor genérico 5kW')).toEqual({ marca: '', modelo: 'Inversor genérico 5kW' });
    expect(separarMarcaYModelo('')).toEqual({ marca: '', modelo: '' });
  });

  test('todo el catálogo inicial tiene marca (nada imprime una clave o un hueco)', () => {
    for (const equipo of [...PANELES_INICIALES, ...INVERSORES_INICIALES]) {
      const { marca, modelo } = separarMarcaYModelo(equipo.nombre);
      expect(marca).not.toBe('');
      expect(modelo).not.toBe('');
      expect(marca).not.toContain('_'); // una clave interna sería "growatt_2500"
    }
  });
});

describe('tipo de equipo inversor', () => {
  test('el valor por defecto es "Inversor"', () => {
    expect(TIPO_EQUIPO_INVERSOR_POR_DEFECTO).toBe('Inversor');
  });

  test.each([
    ['Inversor', 'Inversor' as const],
    ['Microinversor', 'Microinversor' as const],
    ['microinversor', 'Inversor' as const],
    ['', 'Inversor' as const],
    [undefined, 'Inversor' as const],
    [null, 'Inversor' as const],
  ])('normalizar(%p) = %s', (valor, esperado) => {
    expect(normalizarTipoEquipoInversor(valor)).toBe(esperado);
  });

  test('el schema del equipo lo acepta, lo completa si falta y rechaza valores inválidos', () => {
    const base = { panelClave: 'p', cantPaneles: 1, inversorClave: 'i', cantInversores: 1 };
    expect(equipoSeleccionadoSchema.parse(base).tipoEquipoInversor).toBe('Inversor');
    expect(equipoSeleccionadoSchema.parse({ ...base, tipoEquipoInversor: 'Microinversor' }).tipoEquipoInversor).toBe(
      'Microinversor'
    );
    expect(equipoSeleccionadoSchema.safeParse({ ...base, tipoEquipoInversor: 'Otro' }).success).toBe(false);
  });
});
