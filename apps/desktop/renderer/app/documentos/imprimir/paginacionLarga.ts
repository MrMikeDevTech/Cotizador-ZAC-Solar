/**
 * Reparte las líneas de la hoja "Cotización" de la cotización larga en hojas.
 *
 * Mismo problema y mismo criterio que `paginacion.ts` (cotización corta): la
 * hoja tiene alto fijo y `overflow: hidden`, así que las filas que no caben se
 * recortarían en silencio mientras el total seguiría sumándolas. Aquí se
 * decide de antemano cuántas filas le tocan a cada hoja.
 *
 * ## Capacidades (en pt del lienzo A4, ver `DocumentoCotizacionLarga`)
 *
 * La tabla empieza en `top: 148.5` con un encabezado de 26.6 y filas de 28.4;
 * el pie empieza en 728.5. Las firmas ocupan desde 640.
 *
 * | Hoja                                   | Espacio útil        | Filas | Constante |
 * |----------------------------------------|---------------------|-------|-----------|
 * | Última (filas + totales 28.4 + firmas) | 148.5+26.6 → 630    | 14.9  | 14        |
 * | Anterior a otra (solo filas, hasta 718) | 175.1 → 718         | 19.1  | 18        |
 *
 * Cada cifra se redondea hacia abajo y se resta una fila de margen en la
 * primera, porque las filas crecen si una descripción larga se parte en dos
 * líneas.
 */

/** Filas de una hoja que además lleva la fila de totales y las firmas. */
export const CAPACIDAD_ULTIMA = 14;

/** Filas de una hoja que va seguida de otra (sin totales ni firmas). */
export const CAPACIDAD_NO_ULTIMA = 18;

export interface HojaCotizacionLarga<T> {
  /** Lleva la fila de totales y las firmas. */
  esUltima: boolean;
  lineas: T[];
}

/**
 * Función pura. Garantiza que la suma de líneas repartidas es la de entrada y
 * que la última hoja nunca queda sin filas (una hoja con solo totales y firma
 * parecería un error de impresión): si el resto justo llenara las hojas
 * anteriores, se le cede una fila a la última.
 */
export function paginarCotizacionLarga<T>(lineas: readonly T[]): HojaCotizacionLarga<T>[] {
  if (lineas.length <= CAPACIDAD_ULTIMA) {
    return [{ esUltima: true, lineas: [...lineas] }];
  }

  const hojas: HojaCotizacionLarga<T>[] = [];
  let resto = lineas.slice();

  while (resto.length > CAPACIDAD_ULTIMA) {
    // Si lo que queda cabe en una hoja que no es la última, se deja una fila
    // para la última en vez de vaciarla.
    const toma = Math.min(CAPACIDAD_NO_ULTIMA, resto.length - 1);
    hojas.push({ esUltima: false, lineas: resto.slice(0, toma) });
    resto = resto.slice(toma);
  }

  hojas.push({ esUltima: true, lineas: resto });
  return hojas;
}
