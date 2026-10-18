/**
 * Reparte las líneas de la tabla de conceptos de la cotización en páginas
 * (`.hoja`) explícitas.
 *
 * ## Por qué no se deja que el navegador pagine solo
 *
 * `.hoja` tiene alto fijo (11in) y `overflow: hidden` — así se puede colocar
 * la marca de agua con `position: absolute` dentro de cada hoja y que se
 * repita en cada página sin trucos de impresión (`position: fixed` y
 * `table-header-group` dependen de comportamientos de Chromium que varían
 * entre versiones). La consecuencia es que, si las líneas no caben, el
 * `overflow: hidden` las recorta en silencio mientras el TOTAL seguiría
 * sumando las líneas recortadas: un documento donde la suma no cuadra con lo
 * visible. Esta función evita eso generando, de antemano, cuántas líneas le
 * tocan a cada `.hoja` real.
 *
 * ## Las constantes
 *
 * Calculadas a 96dpi sobre los 965px útiles de `.hoja` (alto de fila 56px,
 * alto de `thead` 52px):
 *
 * | Caso                                            | Filas calculadas | Constante |
 * |--------------------------------------------------|------------------|-----------|
 * | Página única (encabezado + intro + pie + firma)   | 8                | 6         |
 * | Página 1 con continuación (sin pie)               | 11               | 9         |
 * | Página intermedia                                 | 16               | 15        |
 * | Última de continuación (con pie + firma)          | 13               | 12        |
 *
 * Se resta una fila a cada cifra calculada como margen de seguridad: las
 * métricas reales de las fuentes autoalojadas (Inter, Playfair Display,
 * Oswald) pueden diferir ligeramente de las que se usaron para el cálculo.
 *
 * Las dos páginas que llevan intro restan **una fila más**. El párrafo de
 * introducción pasó de una frase a un párrafo comercial completo (ver
 * `resolverIntro` en `@cotizador/shared`): medido renderizando ambos textos
 * con el mismo ancho útil y el mismo `.intro`, pasa de 38px a 114px, +76px
 * contra filas de 56px — más de lo que absorbía la fila de margen.
 *
 * De las cifras de la tabla se despejan los bloques fijos (cabecera 233px,
 * pie 168px) y con el intro nuevo salen 6.64 y 9.64 filas: de ahí 6 y 9, que
 * dejan 35.7px de margen. Con 7 y 10 el documento se pasaría 20.3px, y como
 * `.hoja` recorta con `overflow: hidden`, esa última fila desaparecería en
 * silencio mientras el TOTAL la seguiría sumando. Las páginas intermedias y
 * la última no llevan intro, así que no cambian.
 *
 * ## Cómo se reparte
 *
 * Es paginación "de flujo", igual que un procesador de texto: cada página se
 * llena a su capacidad máxima mientras queden más líneas de las que cabrían
 * en una última página; en cuanto el resto cabe en `CAPACIDAD_ULTIMA_CONTINUA`,
 * esa página pasa a ser la última. Esto puede dejar, en casos de frontera
 * exactos, una última página con pocas líneas (o ninguna) además del pie —
 * es el equivalente a una "viuda" en un documento paginado: comportamiento
 * esperado de cualquier paginación de capacidad fija, no un error. El
 * invariante que sí se garantiza siempre es que la suma de líneas repartidas
 * entre todas las páginas es exactamente igual al total de líneas de entrada.
 */

/** Filas cuando todo cabe en una sola hoja (encabezado + intro + pie + firma). */
export const CAPACIDAD_PAGINA_UNICA = 6;

/** Filas de la página 1 cuando hay continuación (lleva encabezado e intro, pero no pie). */
export const CAPACIDAD_PRIMERA_CONTINUA = 9;

/** Filas de una página intermedia (sin encabezado, intro, pie ni firma). */
export const CAPACIDAD_INTERMEDIA = 15;

/** Filas de la última página de una continuación (lleva pie y firma, pero no encabezado). */
export const CAPACIDAD_ULTIMA_CONTINUA = 12;

/** Una página ya resuelta: qué bloques lleva y qué líneas de la tabla le tocan. */
export interface PaginaCotizacion<T> {
  /** Lleva encabezado (título, tabla de datos, logo) e intro. */
  esPrimera: boolean;
  /** Lleva observaciones, TOTAL y firma. */
  esUltima: boolean;
  lineas: T[];
}

/**
 * Reparte `lineas` en una o más páginas según las capacidades de arriba.
 *
 * Función pura: no toca el DOM ni depende de nada externo, por eso se puede
 * probar con arrays sueltos sin montar el componente.
 */
export function paginarLineas<T>(lineas: readonly T[]): PaginaCotizacion<T>[] {
  if (lineas.length <= CAPACIDAD_PAGINA_UNICA) {
    return [{ esPrimera: true, esUltima: true, lineas: [...lineas] }];
  }

  const paginas: PaginaCotizacion<T>[] = [
    { esPrimera: true, esUltima: false, lineas: lineas.slice(0, CAPACIDAD_PRIMERA_CONTINUA) },
  ];

  let resto = lineas.slice(CAPACIDAD_PRIMERA_CONTINUA);
  while (resto.length > CAPACIDAD_ULTIMA_CONTINUA) {
    paginas.push({ esPrimera: false, esUltima: false, lineas: resto.slice(0, CAPACIDAD_INTERMEDIA) });
    resto = resto.slice(CAPACIDAD_INTERMEDIA);
  }

  // Llenar la página anterior hasta su tope puede dejar la última sin una sola
  // fila: con 7, 8 o 9 líneas salía "todo en la primera" + una hoja con la
  // tabla vacía y solo el TOTAL y la firma, que en un documento que recibe el
  // cliente parece un error de impresión. Se le cede una fila de la página
  // anterior para que siempre cierre con contenido.
  if (resto.length === 0) {
    const anterior = paginas[paginas.length - 1]!;
    resto = anterior.lineas.slice(-1);
    anterior.lineas = anterior.lineas.slice(0, -1);
  }

  paginas.push({ esPrimera: false, esUltima: true, lineas: resto });
  return paginas;
}
