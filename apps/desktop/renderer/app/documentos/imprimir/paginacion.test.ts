import { describe, expect, test } from 'bun:test';
import {
  CAPACIDAD_INTERMEDIA,
  CAPACIDAD_PAGINA_UNICA,
  CAPACIDAD_PRIMERA_CONTINUA,
  CAPACIDAD_ULTIMA_CONTINUA,
  paginarLineas,
} from './paginacion.ts';

/** Genera un array de "líneas" (números del 0 al n-1, basta para contar). */
function lineasDePrueba(cantidad: number): number[] {
  return Array.from({ length: cantidad }, (_, i) => i);
}

describe('paginarLineas', () => {
  test.each([0, 5, 7, 8, 12, 30, 60])(
    'la suma de líneas repartidas es igual al total de entrada (%i líneas)',
    (cantidad) => {
      const paginas = paginarLineas(lineasDePrueba(cantidad));
      const total = paginas.reduce((suma, pagina) => suma + pagina.lineas.length, 0);
      expect(total).toBe(cantidad);
    }
  );

  test('0 líneas: una sola página, primera y última a la vez', () => {
    const [pagina] = paginarLineas(lineasDePrueba(0));
    expect(pagina).toEqual({ esPrimera: true, esUltima: true, lineas: [] });
  });

  test(`${CAPACIDAD_PAGINA_UNICA} líneas (el límite exacto de página única): una sola página`, () => {
    const paginas = paginarLineas(lineasDePrueba(CAPACIDAD_PAGINA_UNICA));
    expect(paginas).toHaveLength(1);
    expect(paginas[0]).toMatchObject({ esPrimera: true, esUltima: true });
  });

  test(`${CAPACIDAD_PAGINA_UNICA + 1} líneas: ya no cabe en una sola página, pasa a continuación`, () => {
    const paginas = paginarLineas(lineasDePrueba(CAPACIDAD_PAGINA_UNICA + 1));
    expect(paginas).toHaveLength(2);
    expect(paginas[0]).toMatchObject({ esPrimera: true, esUltima: false });
    expect(paginas[1]).toMatchObject({ esPrimera: false, esUltima: true });
  });

  test('12 líneas: página 1 con continuación + última, sin páginas intermedias', () => {
    const paginas = paginarLineas(lineasDePrueba(12));
    expect(paginas).toHaveLength(2);
    expect(paginas[0]?.lineas).toHaveLength(CAPACIDAD_PRIMERA_CONTINUA);
    expect(paginas[1]?.lineas).toHaveLength(12 - CAPACIDAD_PRIMERA_CONTINUA);
  });

  test('30 líneas: página 1 + una intermedia + última', () => {
    const paginas = paginarLineas(lineasDePrueba(30));
    expect(paginas).toHaveLength(3);
    expect(paginas[0]).toMatchObject({ esPrimera: true, esUltima: false });
    expect(paginas[1]).toMatchObject({ esPrimera: false, esUltima: false });
    expect(paginas[2]).toMatchObject({ esPrimera: false, esUltima: true });
    expect(paginas[0]?.lineas).toHaveLength(CAPACIDAD_PRIMERA_CONTINUA);
  });

  test('60 líneas: varias páginas intermedias, solo la primera y la última llevan sus marcas', () => {
    const paginas = paginarLineas(lineasDePrueba(60));
    expect(paginas.length).toBeGreaterThan(3);
    expect(paginas.filter((p) => p.esPrimera)).toHaveLength(1);
    expect(paginas.filter((p) => p.esUltima)).toHaveLength(1);
    expect(paginas[0]).toBe(paginas.filter((p) => p.esPrimera)[0]);

    // Ninguna página intermedia excede su capacidad.
    for (const pagina of paginas.slice(1, -1)) {
      expect(pagina.lineas.length).toBeLessThanOrEqual(CAPACIDAD_INTERMEDIA);
    }
    expect(paginas[paginas.length - 1]?.lineas.length).toBeLessThanOrEqual(CAPACIDAD_ULTIMA_CONTINUA);
  });

  test('el orden de las líneas se conserva a través de las páginas', () => {
    const entrada = lineasDePrueba(30);
    const paginas = paginarLineas(entrada);
    const reconstruido = paginas.flatMap((p) => p.lineas);
    expect(reconstruido).toEqual(entrada);
  });

  test('no muta el array de entrada', () => {
    const entrada = lineasDePrueba(20);
    const copia = [...entrada];
    paginarLineas(entrada);
    expect(entrada).toEqual(copia);
  });
  test('ninguna página queda sin líneas, para ningún total entre 1 y 80', () => {
    // Llenar la página anterior hasta su tope dejaba la última con 0 filas
    // (p. ej. 8, 9, 10 o 23 líneas): una hoja con la tabla vacía y solo el
    // TOTAL y la firma, que en manos del cliente parece un error.
    for (let n = 1; n <= 80; n++) {
      const paginas = paginarLineas(Array.from({ length: n }, (_, i) => i));
      for (const pagina of paginas) {
        expect(pagina.lineas.length).toBeGreaterThan(0);
      }
      expect(paginas.reduce((acc, p) => acc + p.lineas.length, 0)).toBe(n);
    }
  });
});
