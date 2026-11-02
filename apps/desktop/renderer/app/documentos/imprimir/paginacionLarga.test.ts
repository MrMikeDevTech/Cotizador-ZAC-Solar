import { describe, expect, test } from 'bun:test';
import {
  CAPACIDAD_NO_ULTIMA,
  CAPACIDAD_ULTIMA,
  paginarCotizacionLarga,
} from './paginacionLarga.ts';

const lineas = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('paginarCotizacionLarga', () => {
  test.each([0, 1, 14, 15, 16, 18, 19, 32, 33, 50, 100])(
    'conserva todas las líneas, en orden (%i)',
    (n) => {
      const hojas = paginarCotizacionLarga(lineas(n));
      expect(hojas.flatMap((h) => h.lineas)).toEqual(lineas(n));
    }
  );

  test('hasta la capacidad de la última cabe en una sola hoja', () => {
    expect(paginarCotizacionLarga(lineas(0))).toHaveLength(1);
    const hojas = paginarCotizacionLarga(lineas(CAPACIDAD_ULTIMA));
    expect(hojas).toHaveLength(1);
    expect(hojas[0]!.esUltima).toBe(true);
  });

  test('solo la última hoja lleva totales y firmas', () => {
    const hojas = paginarCotizacionLarga(lineas(40));
    expect(hojas.map((h) => h.esUltima)).toEqual(hojas.map((_, i) => i === hojas.length - 1));
  });

  test('ninguna hoja excede su capacidad y la última nunca queda vacía', () => {
    for (let n = 0; n <= 120; n++) {
      const hojas = paginarCotizacionLarga(lineas(n));
      hojas.forEach((h, i) => {
        const tope = i === hojas.length - 1 ? CAPACIDAD_ULTIMA : CAPACIDAD_NO_ULTIMA;
        expect(h.lineas.length).toBeLessThanOrEqual(tope);
      });
      if (n > 0) expect(hojas[hojas.length - 1]!.lineas.length).toBeGreaterThan(0);
    }
  });

  test('frontera: una línea más que la capacidad pasa a dos hojas', () => {
    const hojas = paginarCotizacionLarga(lineas(CAPACIDAD_ULTIMA + 1));
    expect(hojas).toHaveLength(2);
    expect(hojas[1]!.lineas.length).toBe(1);
  });
});
