import { describe, expect, test } from 'bun:test';
import { buscarLocalidadCatalogo, type LocalidadCatalogo } from './localidadRecibo.ts';

const CATALOGO: LocalidadCatalogo[] = [
  { estado: 'Nayarit', nombre: 'Compostela' },
  { estado: 'Nayarit', nombre: 'Tepic' },
  { estado: 'Nayarit', nombre: 'Ixtlán del Río' },
  { estado: 'Nayarit', nombre: 'Bahía de Banderas' },
  { estado: 'Jalisco', nombre: 'Zapopan' },
  { estado: 'Jalisco', nombre: 'San Pedro Tlaquepaque' },
  { estado: 'Jalisco', nombre: 'Tepic' }, // mismo nombre en otro estado: no debe mezclarse
];

const buscar = (estado: string, localidad: string, municipio = '', catalogo = CATALOGO) =>
  buscarLocalidadCatalogo({ estado, localidad, municipio }, catalogo);

describe('buscarLocalidadCatalogo', () => {
  test('coincidencia exacta, sin importar acentos, mayúsculas ni partículas', () => {
    expect(buscar('Nayarit', 'Ixtlan', 'IXTLAN DEL RIO')).toEqual({ estado: 'Nayarit', nombre: 'Ixtlán del Río' });
    expect(buscar('Nayarit', 'Bahia de Banderas')).toEqual({ estado: 'Nayarit', nombre: 'Bahía de Banderas' });
  });

  test('el municipio impreso manda sobre la localidad', () => {
    expect(buscar('Jalisco', 'Colonia Centro', 'Zapopan')?.nombre).toBe('Zapopan');
  });

  test('si el municipio no aparece, prueba con la localidad', () => {
    expect(buscar('Nayarit', 'Tepic', 'Barrio Sin Catalogo')?.nombre).toBe('Tepic');
  });

  test('solo busca dentro del estado indicado', () => {
    expect(buscar('Nayarit', 'Tepic')).toEqual({ estado: 'Nayarit', nombre: 'Tepic' });
    expect(buscar('Jalisco', 'Tepic')).toEqual({ estado: 'Jalisco', nombre: 'Tepic' });
    expect(buscar('Jalisco', 'Compostela')).toBeNull();
  });

  test('una versión corta o larga del nombre sirve si solo hay una entrada posible', () => {
    expect(buscar('Jalisco', 'Tlaquepaque')?.nombre).toBe('San Pedro Tlaquepaque');
    expect(buscar('Nayarit', 'Compostela Centro')?.nombre).toBe('Compostela');
  });

  test('tolera una letra mal leída por el OCR ("Sxtlan del Rio")', () => {
    expect(buscar('Nayarit', '', 'SXTLAN DEL RIO')?.nombre).toBe('Ixtlán del Río');
  });

  test('un municipio que no está en el catálogo da null: no se inventa uno parecido', () => {
    // Caso real del recibo de ejemplo: "Ixtapa de la Concepción" no está en el catálogo.
    expect(buscar('Nayarit', 'Ixtapa', 'Ixtapa la Concepcion')).toBeNull();
  });

  test('si lo que se parece son dos entradas por igual, no elige ninguna', () => {
    const ambiguo: LocalidadCatalogo[] = [
      { estado: 'Nayarit', nombre: 'San Blas' },
      { estado: 'Nayarit', nombre: 'San Blaa' },
    ];
    expect(buscar('Nayarit', '', 'San Blaz', ambiguo)).toBeNull();
  });

  test('sin estado, o con un estado fuera del catálogo, no hay resultado', () => {
    expect(buscar('', 'Tepic')).toBeNull();
    expect(buscar('Yucatán', 'Tepic')).toBeNull();
  });

  test('textos vacíos no devuelven nada', () => {
    expect(buscar('Nayarit', '', '')).toBeNull();
  });
});
