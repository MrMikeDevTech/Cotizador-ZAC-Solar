/**
 * Etiquetas de los 6 periodos del Paso 2 ("marzo 2026" a "mayo 2026").
 *
 * Salen de la fecha de inicio del periodo más reciente (`YYYY-MM-DD`) y de si
 * el recibo es bimestral o mensual. Vive aquí, y no dentro de `Paso2Consumo`,
 * porque también la necesita el autocompletado desde el recibo CFE: así los
 * Pasos 3 a 5 ven las etiquetas aunque el asesor no vuelva a abrir el Paso 2.
 */

export interface EtiquetasPeriodo {
  inicioStr: string;
  terminoStr: string;
}

/**
 * Etiquetas del periodo número `indice` (0 = el más reciente; los siguientes
 * van hacia atrás). Devuelve `null` si la fecha de inicio aún no está completa.
 */
export function etiquetasDePeriodo(
  fechaInicio: string,
  periodo: string,
  indice: number
): EtiquetasPeriodo | null {
  if (!fechaInicio || fechaInicio.length < 10) return null;

  const [anio, mes] = fechaInicio.split('-');
  const anioInicio = parseInt(anio ?? '', 10);
  const mesInicio = parseInt(mes ?? '', 10) - 1;
  if (Number.isNaN(anioInicio) || Number.isNaN(mesInicio)) return null;

  const paso = periodo === 'Bimestral' ? 2 : 1;
  const inicio = new Date(anioInicio, mesInicio - indice * paso, 15);
  const termino = new Date(anioInicio, mesInicio - indice * paso + paso, 15);

  const nombre = (fecha: Date) =>
    `${fecha.toLocaleString('es-MX', { month: 'long' }).toLowerCase()} ${fecha.getFullYear()}`;

  return { inicioStr: nombre(inicio), terminoStr: nombre(termino) };
}
