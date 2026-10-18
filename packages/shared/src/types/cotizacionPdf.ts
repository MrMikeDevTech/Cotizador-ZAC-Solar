/**
 * Contrato del documento PDF de cotización.
 *
 * `DatosCotizacionPdf` es exactamente lo que consume la plantilla aprobada
 * (ver el documento en `apps/desktop/renderer/app/documentos/imprimir/`): un
 * objeto plano, ya formateado y ordenado, sin nada que el componente tenga
 * que decidir. Toda la lógica —unir las tres fuentes de líneas, resolver
 * cantidades, cuadrar el total— vive en `construirCotizacionPdf`, que es una
 * función pura y por tanto testeable sin renderizar.
 */

/** Una fila de la tabla Descripción / Cantidad / Precio. */
export interface LineaCotizacionPdf {
  /**
   * Admite `**negrita**` al estilo Markdown, como en la plantilla original
   * (`Panel marca **Jinko Bifacial 620W.**`). El documento lo convierte a
   * `<b>`; nunca se interpola HTML crudo.
   */
  descripcion: string;
  cantidad: number;
  /** Importe de la línea en MXN. Negativo en la línea de descuento. */
  importe: number;
}

/**
 * Datos de la empresa que se imprimen. `null` cuando todavía no se han
 * capturado: el documento entonces omite logo y firma, pero sigue siendo una
 * cotización válida.
 */
export interface EmpresaPdf {
  nombre: string;
  telefono: string;
  localidad: string;
  email: string;
  tituloCotizacion: string;
  introPlantilla: string;
  /** Una observación por línea. */
  observaciones: string;
  firmaNombre: string;
  firmaPuesto: string;
}

export interface DatosCotizacionPdf {
  titulo: string;
  /** Ya formateada en es-MX, p. ej. "28/Agosto/2026". */
  fecha: string;
  cliente: string;
  ubicacion: string;
  telefono: string;
  metodoPago: string;
  intro: string;
  /**
   * Líneas en el orden en que se imprimen: conceptos, estructura, cargos y,
   * si aplican, descuento e IVA.
   *
   * **Invariante:** la suma de `importe` es igual a `total`. Es lo que evita
   * entregar al cliente un documento cuyas líneas no cuadran con lo que paga,
   * y está cubierto por tests.
   */
  lineas: LineaCotizacionPdf[];
  total: number;
  observaciones: string[];
  /** Vacío = no se imprime el bloque de firma. */
  firmaNombre: string;
  firmaPuesto: string;
  /** `false` cuando no hay empresa configurada: sin logo ni marca de agua. */
  mostrarLogo: boolean;
}
