/**
 * Datos de la Carta Poder ante CFE (plantilla en
 * `docs/referencia-carta-poder/carta_poder_cfe_plantilla.html`).
 *
 * Funciones puras: qué datos pide el documento, cuáles faltan y cómo se
 * escribe la fecha. Las usan el modal de confirmación y la vista de impresión,
 * para que ambos coincidan en qué cuenta como "completo".
 */

export interface DatosCartaPoder {
  /** Quien recibe el poder: el usuario de la sesión. */
  nombreApoderado: string;
  /** Quien lo otorga: el cliente. */
  nombreCliente: string;
  direccionCompleta: string;
  codigoPostal: string;
  numeroServicio: string;
  numeroMedidor: string;
}

export type CampoCartaPoder = keyof DatosCartaPoder;

export const ETIQUETAS_CARTA_PODER: Record<CampoCartaPoder, string> = {
  nombreApoderado: 'Nombre del apoderado',
  nombreCliente: 'Nombre del otorgante (cliente)',
  direccionCompleta: 'Dirección completa',
  codigoPostal: 'Código postal',
  numeroServicio: 'No. de servicio CFE',
  numeroMedidor: 'No. de medidor',
};

/** Subconjunto del proyecto guardado (`GET /api/proyectos/:id`) que usa la carta. */
export interface ProyectoParaCartaPoder {
  numeroServicio: string;
  direccion?: string;
  codigoPostal?: string;
  numeroMedidor?: string;
  contacto: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    esEmpresa: boolean;
    razonSocial: string;
  } | null;
}

/**
 * Datos de la carta a partir del proyecto guardado y del usuario en sesión.
 * El otorgante es la razón social si el cliente es una empresa; si no, la persona.
 */
export function construirDatosCartaPoder(
  proyecto: ProyectoParaCartaPoder,
  nombreApoderado: string
): DatosCartaPoder {
  const c = proyecto.contacto;
  const persona = c
    ? [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ')
    : '';
  return {
    nombreApoderado: nombreApoderado.trim(),
    nombreCliente: (c?.esEmpresa && c.razonSocial.trim() !== '' ? c.razonSocial : persona).trim(),
    direccionCompleta: (proyecto.direccion ?? '').trim(),
    codigoPostal: (proyecto.codigoPostal ?? '').trim(),
    numeroServicio: proyecto.numeroServicio.trim(),
    numeroMedidor: (proyecto.numeroMedidor ?? '').trim(),
  };
}

/** Campos que no vacíos (tras recortar espacios) hacen falta para imprimir la carta. */
export function camposFaltantesCartaPoder(datos: DatosCartaPoder): CampoCartaPoder[] {
  return (Object.keys(ETIQUETAS_CARTA_PODER) as CampoCartaPoder[]).filter(
    (campo) => datos[campo].trim() === ''
  );
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** `12 de Marzo del 2025`, como en la plantilla. */
export function fechaCartaPoder(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} del ${fecha.getFullYear()}`;
}
